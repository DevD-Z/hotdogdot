package app.hotdogdot.music

import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Keeps the media notification up and, just as importantly, keeps the process in
 * the foreground while a song is playing.
 *
 * Audio decoded inside the WebView is otherwise ordinary background work: Android
 * 8+ background limits and the extra-aggressive ColorOS/MIUI policies on top are
 * free to freeze the process once the screen is off. A mediaPlayback foreground
 * service is the documented way to say "this is music, leave it running".
 */
class PlaybackService : Service() {
  private val commands = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      val command = intent?.getStringExtra(MediaControls.EXTRA_COMMAND) ?: return
      MediaControls.dispatch(command, intent.getLongExtra(MediaControls.EXTRA_VALUE, 0L))
      if (command == "stop") stopSelf()
    }
  }
  private var listening = false

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    val filter = IntentFilter(MediaControls.ACTION_COMMAND)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(commands, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      registerReceiver(commands, filter)
    }
    listening = true
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val notification = MediaControls.notification(this)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        MediaControls.NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
      )
    } else {
      startForeground(MediaControls.NOTIFICATION_ID, notification)
    }
    return START_NOT_STICKY
  }

  /** Swiping the app away kills the WebView, so there is nothing left to control. */
  override fun onTaskRemoved(rootIntent: Intent?) {
    stopSelf()
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    if (listening) {
      unregisterReceiver(commands)
      listening = false
    }
    MediaControls.release(this)
    super.onDestroy()
  }
}
