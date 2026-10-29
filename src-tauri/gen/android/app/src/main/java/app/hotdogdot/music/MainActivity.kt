package app.hotdogdot.music

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import org.json.JSONObject
import org.json.JSONTokener

/**
 * The "stay visible" assertion is re-applied on a schedule for as long as the
 * activity is in the background, first quickly and then steadily.
 *
 * The framework dispatches window visibility *after* onPause/onStop return —
 * measured 350ms later on ColorOS — so a single call inside onPause is
 * overwritten and the audio dies again; the fast burst is what wins that
 * transition. The steady phase then has to continue indefinitely: with the
 * assertion stopping after 2s, playback on CPH1937 survived the lock but
 * Chromium suspended the decoder again ~10s later, which cost an audible gap
 * each time. Two JNI calls per second is nothing next to decoding audio.
 */
private const val VISIBILITY_BURST_REASSERTS = 8
private const val VISIBILITY_BURST_INTERVAL_MS = 250L
private const val VISIBILITY_STEADY_INTERVAL_MS = 1000L

/**
 * How often the page is asked what it is playing. The notification's seek bar is
 * driven by the PlaybackState's position and speed, so the system interpolates
 * between polls and a second's granularity is not visible.
 */
private const val MEDIA_POLL_INTERVAL_MS = 1000L

class MainActivity : TauriActivity() {
  private var contentWebView: WebView? = null
  private val handler = Handler(Looper.getMainLooper())
  private var burstsLeft = 0
  private var playbackServiceStarted = false

  private val keepMediaAwake = object : Runnable {
    override fun run() {
      val webView = contentWebView ?: return
      keepAudioAlive(webView)
      val interval = if (burstsLeft > 0) {
        burstsLeft -= 1
        VISIBILITY_BURST_INTERVAL_MS
      } else {
        VISIBILITY_STEADY_INTERVAL_MS
      }
      handler.postDelayed(this, interval)
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    requestNotificationPermission()
  }

  /**
   * Without this the media notification is dropped silently on Android 13+. The
   * prompt is harmless if it is denied — playback still works, only the controls
   * are missing, which is the state the app was in before.
   */
  private fun requestNotificationPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val granted = checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
      PackageManager.PERMISSION_GRANTED
    if (!granted) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    contentWebView = webView
    MediaControls.commandSink = { command, value -> sendToPage(command, value) }
    handler.removeCallbacks(mediaPoll)
    handler.post(mediaPoll)
  }

  /** Notification and lock-screen buttons, handed to the page's own controls. */
  private fun sendToPage(command: String, value: Long) {
    val script = "window.__hdMediaCommand && window.__hdMediaCommand(" +
      "${JSONObject.quote(command)}, $value)"
    handler.post { contentWebView?.evaluateJavascript(script, null) }
  }

  /**
   * The page publishes what it is playing on `window.__hdMedia`; polling it is
   * what keeps the notification, the lock screen and the Bluetooth keys in step
   * with an engine that lives entirely inside the WebView.
   */
  private val mediaPoll = object : Runnable {
    override fun run() {
      val webView = contentWebView
      if (webView == null) return
      webView.evaluateJavascript("JSON.stringify(window.__hdMedia||null)") { raw ->
        applySnapshot(parseSnapshot(raw))
      }
      handler.postDelayed(this, MEDIA_POLL_INTERVAL_MS)
    }
  }

  private fun parseSnapshot(raw: String?): MediaSnapshot? {
    if (raw == null || raw == "null") return null
    val decoded = runCatching { JSONTokener(raw).nextValue() as? String }.getOrNull() ?: return null
    val json = runCatching { JSONObject(decoded) }.getOrNull() ?: return null
    return MediaSnapshot(
      id = json.optString("id"),
      title = json.optString("title"),
      artist = json.optString("artist"),
      artworkUrl = json.optString("artwork"),
      playing = json.optBoolean("playing"),
      positionMs = json.optLong("position"),
      durationMs = json.optLong("duration"),
    )
  }

  private fun applySnapshot(snapshot: MediaSnapshot?) {
    if (snapshot == null || snapshot.id.isEmpty()) {
      stopPlaybackService()
      return
    }
    MediaControls.publish(this, snapshot)
    if (!playbackServiceStarted) {
      // Android 12+ refuses a foreground-service start from the background. That
      // only happens if the first snapshot arrives while the app is already away,
      // in which case the notification simply waits for the next foreground poll.
      playbackServiceStarted = runCatching {
        startForegroundService(Intent(this, PlaybackService::class.java))
      }.isSuccess
    }
  }

  private fun stopPlaybackService() {
    if (!playbackServiceStarted) return
    playbackServiceStarted = false
    stopService(Intent(this, PlaybackService::class.java))
  }

  /**
   * Chromium only keeps HTML5 media running while the WebContents is visible, and
   * it decides that from three separate flags. WebView.onPause() sets the paused
   * flag, and the activity going to the background clears the window-visible
   * flag; either one on its own is enough to suspend the audio decoder.
   *
   * Measured on CPH1937 with only onResume(): the audio stream restarted and
   * Chromium suspended it again 27ms later, because window visibility was still
   * false. Both flags have to be restored, hence dispatchWindowVisibilityChanged.
   *
   * Note that View.getWindowVisibility() keeps reporting the framework's value
   * after this call — the dispatch reaches Chromium's listener without touching
   * mAttachInfo — so the getter cannot be used to check whether this worked. The
   * evidence is the audio itself: with this in place a locked screen played 90s
   * of uninterrupted audio where it previously went silent within seconds.
   */
  private fun keepAudioAlive(webView: WebView) {
    webView.onResume()
    webView.dispatchWindowVisibilityChanged(View.VISIBLE)
  }

  private fun startKeepingAudioAlive() {
    handler.removeCallbacks(keepMediaAwake)
    burstsLeft = VISIBILITY_BURST_REASSERTS
    keepMediaAwake.run()
  }

  /**
   * WryActivity.onPause() calls WebView.onPause(), which is exactly why playback
   * died the instant the screen locked. Counter it here — WryActivity.kt is
   * auto-generated, so the override has to live in this class.
   */
  override fun onPause() {
    super.onPause()
    startKeepingAudioAlive()
  }

  /**
   * The stop transition is where the framework actually hides the window, so the
   * assertion has to be restarted here as well and not only on pause.
   */
  override fun onStop() {
    super.onStop()
    startKeepingAudioAlive()
  }

  override fun onResume() {
    // The framework dispatches a real VISIBLE from here on; stop shadowing it.
    handler.removeCallbacks(keepMediaAwake)
    burstsLeft = 0
    super.onResume()
  }

  override fun onDestroy() {
    handler.removeCallbacks(keepMediaAwake)
    handler.removeCallbacks(mediaPoll)
    MediaControls.commandSink = null
    stopPlaybackService()
    contentWebView = null
    super.onDestroy()
  }
}
