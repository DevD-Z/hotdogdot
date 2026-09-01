use std::{env, fs, path::Path};

fn env_file_value(key: &str) -> Option<String> {
    let contents = fs::read_to_string(Path::new("../.env")).ok()?;
    contents.lines().find_map(|line| {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') { return None; }
        let (name, value) = line.split_once('=')?;
        (name.trim() == key).then(|| value.trim().trim_matches('"').to_string())
    })
}

fn main() {
    println!("cargo:rerun-if-changed=../.env");
    let discord_client_id = env::var("DISCORD_CLIENT_ID")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| env_file_value("DISCORD_CLIENT_ID"));

    if let Some(client_id) = discord_client_id {
        println!("cargo:rustc-env=HOTDOGDOT_DISCORD_CLIENT_ID={client_id}");
    }
    tauri_build::build()
}
