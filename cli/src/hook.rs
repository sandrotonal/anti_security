use std::fs;
use std::path::Path;

const PRE_COMMIT_HOOK: &str = r#"#!/bin/sh
# securify pre-commit hook
# this hook runs securify scan on staged files before each commit.

exec securify scan --staged
"#;

const POST_COMMIT_HOOK: &str = r#"#!/bin/sh
# securify post-commit hook
# runs after commit to verify no secrets were committed.

exec securify scan --staged --post-commit
"#;

pub fn init_hook(path: &Path) -> Result<String, String> {
    let git_dir = if path.join(".git").exists() {
        path.join(".git")
    } else {
        return Err("no .git directory found in the current path".to_string());
    };

    let hooks_dir = git_dir.join("hooks");
    if !hooks_dir.exists() {
        fs::create_dir_all(&hooks_dir)
            .map_err(|e| format!("failed to create hooks directory: {}", e))?;
    }

    let pre_commit_path = hooks_dir.join("pre-commit");
    fs::write(&pre_commit_path, PRE_COMMIT_HOOK)
        .map_err(|e| format!("failed to write pre-commit hook: {}", e))?;

    set_executable(&pre_commit_path);

    let message = format!(
        "securify pre-commit hook initialized at {}",
        pre_commit_path.display()
    );
    Ok(message)
}

pub fn remove_hook(path: &Path) -> Result<String, String> {
    let hook_path = path.join(".git").join("hooks").join("pre-commit");
    if hook_path.exists() {
        fs::remove_file(&hook_path)
            .map_err(|e| format!("failed to remove hook: {}", e))?;
        Ok("securify pre-commit hook removed successfully".to_string())
    } else {
        Err("no securify hook found".to_string())
    }
}

#[cfg(unix)]
fn set_executable(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(meta) = fs::metadata(path) {
        let mut perms = meta.permissions();
        perms.set_mode(0o755);
        let _ = fs::set_permissions(path, perms);
    }
}

#[cfg(not(unix))]
fn set_executable(_path: &Path) {
    // no-op on windows
}
