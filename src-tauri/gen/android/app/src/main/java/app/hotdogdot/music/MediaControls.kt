package app.hotdogdot.music

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.Icon
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import java.net.HttpURLConnection
import java.net.URL

/** What the web player is doing, as polled out of the page every second. */
data class MediaSnapshot(
  val id: String,
  val title: String,
  val artist: String,
  val artworkUrl: String,
  val playing: Boolean,
  val positionMs: Long,
  val durationMs: Long,
)

/**
 * The lock-screen and notification-shade controls for playback that happens
 * inside the WebView.
 *
 * Android WebView never bridges `navigator.mediaSession` to a platform
 * MediaSession — verified on-device with `dumpsys media_session` — so the page
 * cannot publish itself. This owns a real platform MediaSession instead, mirrors
 * the page's state into it, and sends button presses back into the page. The
 * media3 session that tauri-plugin-native-audio brings along only exists while
 * the native engine is playing, which needs a Lavalink node that can extract
 * audio; this path covers the WebView engine, which is what actually plays.
 */
object MediaControls {
  const val ACTION_COMMAND = "app.hotdogdot.music.MEDIA_COMMAND"
  const val EXTRA_COMMAND = "command"
  const val EXTRA_VALUE = "value"
  const val NOTIFICATION_ID = 0x48_44
  private const val CHANNEL_ID = "hotdogdot.playback"

  /** Set by MainActivity, the only class that can reach the page. */
  var commandSink: ((String, Long) -> Unit)? = null

  private var session: MediaSession? = null
  private var snapshot: MediaSnapshot? = null
  private var artwork: Bitmap? = null
  private var artworkUrl: String? = null
  private var artworkInFlight: String? = null

  fun snapshot(): MediaSnapshot? = snapshot

  private fun session(context: Context): MediaSession =
    session ?: MediaSession(context.applicationContext, "hotdogdot").also { created ->
      created.setCallback(object : MediaSession.Callback() {
        override fun onPlay() { send("play") }
        override fun onPause() { send("pause") }
        override fun onSkipToNext() { send("next") }
        override fun onSkipToPrevious() { send("previous") }
        override fun onStop() { send("stop") }
        override fun onSeekTo(pos: Long) { send("seek", pos) }
      })
      created.isActive = true
      session = created
    }

  private fun send(command: String, value: Long = 0L) {
    commandSink?.invoke(command, value)
  }

  /**
   * Mirror one poll of the page into the session, and repost the notification
   * when something visible changed. Position is carried by the PlaybackState
   * rather than the notification, so the seek bar keeps moving between reposts.
   */
  fun publish(context: Context, next: MediaSnapshot) {
    val previous = snapshot
    snapshot = next
    val session = session(context)
    val changed = previous == null
      || previous.id != next.id
      || previous.playing != next.playing
      || previous.title != next.title

    if (previous?.id != next.id || previous.durationMs != next.durationMs) {
      if (previous?.id != next.id) artwork = null
      applyMetadata(session, next)
      loadArtwork(context, next.artworkUrl)
    }
    session.setPlaybackState(
      PlaybackState.Builder()
        .setState(
          if (next.playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED,
          next.positionMs,
          if (next.playing) 1f else 0f,
        )
        .setActions(
          PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE
            or PlaybackState.ACTION_PLAY_PAUSE or PlaybackState.ACTION_SKIP_TO_NEXT
            or PlaybackState.ACTION_SKIP_TO_PREVIOUS or PlaybackState.ACTION_SEEK_TO
            or PlaybackState.ACTION_STOP,
        )
        .build(),
    )
    if (changed) notify(context)
  }

  private fun applyMetadata(session: MediaSession, state: MediaSnapshot) {
    val metadata = MediaMetadata.Builder()
      .putString(MediaMetadata.METADATA_KEY_TITLE, state.title)
      .putString(MediaMetadata.METADATA_KEY_ARTIST, state.artist)
      .putLong(MediaMetadata.METADATA_KEY_DURATION, state.durationMs)
    artwork?.let { metadata.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, it) }
    session.setMetadata(metadata.build())
  }

  /**
   * Artwork has to be a Bitmap for the lock screen, and the only copy we have is
   * a URL the page was given. One in-flight fetch at a time, dropped if the track
   * changes before it lands.
   */
  private fun loadArtwork(context: Context, url: String) {
    if (url.isEmpty() || url == artworkUrl || url == artworkInFlight) return
    artworkInFlight = url
    Thread {
      val bitmap = runCatching {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
          connectTimeout = 8_000
          readTimeout = 8_000
          instanceFollowRedirects = true
        }
        connection.inputStream.use { BitmapFactory.decodeStream(it) }
      }.getOrNull()
      artworkInFlight = null
      if (bitmap == null || snapshot?.artworkUrl != url) return@Thread
      artwork = bitmap
      artworkUrl = url
      val live = session ?: return@Thread
      snapshot?.let { applyMetadata(live, it) }
      notify(context)
    }.start()
  }

  fun notify(context: Context) {
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    if (snapshot == null) return
    manager.notify(NOTIFICATION_ID, notification(context))
  }

  fun release(context: Context) {
    snapshot = null
    artwork = null
    artworkUrl = null
    session?.isActive = false
    session?.release()
    session = null
    context.getSystemService(NotificationManager::class.java)?.cancel(NOTIFICATION_ID)
  }

  /**
   * MediaStyle plus an active session is what the shade turns into a media card,
   * and what the lock screen shows without the app being visible at all.
   */
  fun notification(context: Context): Notification {
    val state = snapshot
    val manager = context.getSystemService(NotificationManager::class.java)
    if (manager?.getNotificationChannel(CHANNEL_ID) == null) {
      manager?.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Playback", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Media controls for the current song"
          setShowBadge(false)
          enableVibration(false)
        },
      )
    }
    val playing = state?.playing == true
    val builder = Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_playback)
      .setContentTitle(state?.title ?: context.getString(R.string.app_name))
      .setContentText(state?.artist ?: "")
      .setContentIntent(openApp(context))
      .setDeleteIntent(command(context, "stop"))
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(playing)
      .setShowWhen(false)
      .setOnlyAlertOnce(true)
      .addAction(action(context, android.R.drawable.ic_media_previous, "Previous", "previous"))
      .addAction(
        if (playing) action(context, android.R.drawable.ic_media_pause, "Pause", "pause")
        else action(context, android.R.drawable.ic_media_play, "Play", "play"),
      )
      .addAction(action(context, android.R.drawable.ic_media_next, "Next", "next"))
    artwork?.let { builder.setLargeIcon(it) }
    val style = Notification.MediaStyle().setShowActionsInCompactView(0, 1, 2)
    session?.let { style.setMediaSession(it.sessionToken) }
    return builder.setStyle(style).build()
  }

  private fun openApp(context: Context): PendingIntent =
    PendingIntent.getActivity(
      context,
      0,
      Intent(context, MainActivity::class.java)
        .setAction(Intent.ACTION_MAIN)
        .addCategory(Intent.CATEGORY_LAUNCHER),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  private fun command(context: Context, name: String): PendingIntent =
    PendingIntent.getBroadcast(
      context,
      name.hashCode(),
      Intent(ACTION_COMMAND).setPackage(context.packageName).putExtra(EXTRA_COMMAND, name),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  private fun action(context: Context, icon: Int, title: String, name: String): Notification.Action =
    Notification.Action.Builder(Icon.createWithResource(context, icon), title, command(context, name))
      .build()

  /** Buttons are dispatched from the notification and from Bluetooth/headset keys. */
  fun dispatch(command: String, value: Long) {
    send(command, value)
  }
}
