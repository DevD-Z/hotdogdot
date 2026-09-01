#[cfg(desktop)]
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
#[cfg(desktop)]
use std::sync::Mutex;

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
        .plugin(tauri_plugin_http::init());
    #[cfg(desktop)]
    let builder = builder
        .manage(DiscordState::default())
        .invoke_handler(tauri::generate_handler![discord_initialize, discord_update_activity, discord_clear_activity])
        ;
    builder.run(tauri::generate_context!())
        .expect("error while running hotdogdot");
}
