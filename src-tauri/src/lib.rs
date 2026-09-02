#[cfg(desktop)]
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
#[cfg(desktop)]
use std::sync::Mutex;
use tauri::Manager;

#[tauri::command]
async fn cache_lavalink_youtube(
    app: tauri::AppHandle,
    video_id: String,
    base_url: String,
    password: String,
) -> Result<String, String> {
    if video_id.len() != 11 || !video_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err("Invalid YouTube video ID".into());
    }
    let base = reqwest::Url::parse(&base_url).map_err(|_| "Invalid Lavalink URL")?;
    if base.scheme() != "https" {
        return Err("Native streaming requires HTTPS".into());
    }
    let cache_dir = app.path().app_cache_dir().map_err(|error| format!("Cannot resolve app cache: {error}"))?;
    std::fs::create_dir_all(&cache_dir).map_err(|error| format!("Cannot create app cache: {error}"))?;
    let cache_path = cache_dir.join(format!("hotdogdot-{video_id}.webm"));
    if cache_path.metadata().map(|meta| meta.len() > 32_000).unwrap_or(false) {
        return Ok(format!("file:///{}", cache_path.to_string_lossy().replace('\\', "/")));
    }
    let url = format!("{}/youtube/stream/{}?withClient=ANDROID_VR", base_url.trim_end_matches('/'), video_id);
    let response = reqwest::Client::new()
        .get(url)
        .header("Authorization", password)
        .send().await.map_err(|error| format!("Stream request failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("Lavalink stream returned HTTP {}", response.status()));
    }
    if response.content_length().unwrap_or(0) > 64 * 1024 * 1024 {
        return Err("Audio stream is larger than 64 MB".into());
    }
    let bytes = response.bytes().await.map_err(|error| format!("Stream download failed: {error}"))?;
    if bytes.len() > 64 * 1024 * 1024 { return Err("Audio stream is larger than 64 MB".into()); }
    std::fs::write(&cache_path, &bytes).map_err(|error| format!("Cannot cache audio: {error}"))?;
    Ok(format!("file:///{}", cache_path.to_string_lossy().replace('\\', "/")))
}

#[cfg(desktop)]
struct DiscordState {
    client: Mutex<Option<DiscordIpcClient>>,
    started_at: i64,
}

#[cfg(desktop)]
impl Default for DiscordState {
    fn default() -> Self {
        Self {
            client: Mutex::new(None),
            started_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|duration| duration.as_secs() as i64)
                .unwrap_or_default(),
        }
    }
}

#[cfg(desktop)]
fn configured_client_id() -> Result<&'static str, String> {
    option_env!("HOTDOGDOT_DISCORD_CLIENT_ID")
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Discord Rich Presence is disabled: DISCORD_CLIENT_ID is not configured".to_string())
}

#[cfg(desktop)]
fn connected_client() -> Result<DiscordIpcClient, String> {
    let mut client = DiscordIpcClient::new(configured_client_id()?).map_err(|error| error.to_string())?;
    client.connect().map_err(|error| error.to_string())?;
    Ok(client)
}

#[tauri::command]
#[cfg(desktop)]
fn discord_initialize(state: tauri::State<'_, DiscordState>) -> Result<(), String> {
    let mut slot = state.client.lock().map_err(|_| "Discord state is unavailable".to_string())?;
    if slot.is_none() { *slot = Some(connected_client()?); }
    Ok(())
}

#[tauri::command]
#[cfg(desktop)]
fn discord_update_activity(page: String, details: Option<String>, state: tauri::State<'_, DiscordState>) -> Result<(), String> {
    let mut slot = state.client.lock().map_err(|_| "Discord state is unavailable".to_string())?;
    if slot.is_none() { *slot = Some(connected_client()?); }
    let details = details.unwrap_or_else(|| "Using hotdogdot".to_string());
    let activity = activity::Activity::new()
        .details(&details)
        .state(&page)
        .assets(activity::Assets::new().large_image("hotdogdot").large_text("hotdogdot"))
        .timestamps(activity::Timestamps::new().start(state.started_at));

    let client = slot.as_mut().ok_or_else(|| "Discord is unavailable".to_string())?;
    if client.set_activity(activity.clone()).is_err() {
        let mut replacement = connected_client()?;
        replacement.set_activity(activity).map_err(|error| error.to_string())?;
        *client = replacement;
    }
    Ok(())
}

#[tauri::command]
#[cfg(desktop)]
fn discord_clear_activity(state: tauri::State<'_, DiscordState>) -> Result<(), String> {
    let mut slot = state.client.lock().map_err(|_| "Discord state is unavailable".to_string())?;
    if let Some(client) = slot.as_mut() { client.clear_activity().map_err(|error| error.to_string())?; }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_native_audio::init());
    #[cfg(desktop)]
    let builder = builder
        .manage(DiscordState::default())
        .invoke_handler(tauri::generate_handler![discord_initialize, discord_update_activity, discord_clear_activity, cache_lavalink_youtube])
        ;
    #[cfg(mobile)]
    let builder = builder.invoke_handler(tauri::generate_handler![cache_lavalink_youtube]);
    builder.run(tauri::generate_context!())
        .expect("error while running hotdogdot");
}
