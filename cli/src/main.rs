use std::path::PathBuf;

use clap::{Parser, Subcommand};
use colored::Colorize;

mod config;
mod entropy;
mod hook;
mod report;
mod rules;
mod scanner;

#[derive(Parser)]
#[command(name = "securify")]
#[command(about = "Client-side credential leak detection CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Scan a directory or file for leaked credentials
    Scan {
        /// Path to file or directory to scan
        path: Option<PathBuf>,

        /// Output format (terminal, json)
        #[arg(long, default_value = "terminal")]
        format: String,

        /// Only scan files in git staging area
        #[arg(long, default_value_t = false)]
        staged: bool,

        /// Post-commit mode (less verbose)
        #[arg(long, default_value_t = false)]
        post_commit: bool,
    },
    /// List all scanning rules
    Rules {
        /// Filter by category (cloud, database, saas, vcs)
        #[arg(long)]
        category: Option<String>,

        /// Output format (terminal, json)
        #[arg(long, default_value = "terminal")]
        format: String,
    },
    /// Initialize git pre-commit hook
    InitHook {
        /// Path to git repository root
        #[arg(default_value = ".")]
        path: Option<PathBuf>,
    },
    /// Remove securify git hook
    RemoveHook {
        /// Path to git repository root
        #[arg(default_value = ".")]
        path: Option<PathBuf>,
    },
    /// Check entropy of a string
    Entropy {
        /// String to calculate entropy for
        input: String,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Scan {
            path,
            format,
            staged: _,
            post_commit: _,
        } => {
            let target_path = path.unwrap_or_else(|| PathBuf::from("."));
            let mut scan_config = scanner::ScannerConfig::default();

            if let Some(toml) = config::load_config(&target_path) {
                scan_config = config::merge_config(scan_config, toml);
            }

            let result = scanner::scan_path(&target_path, &scan_config);

            match format.as_str() {
                "json" => report::print_json_report(&result),
                _ => report::print_terminal_report(&result),
            }

            if result.total_leaks > 0 {
                std::process::exit(1);
            }
        }
        Commands::Rules { category, format } => {
            let all_rules = rules::get_rules();
            let filtered: Vec<_> = match category {
                Some(ref cat) => all_rules
                    .into_iter()
                    .filter(|r| r.category == cat || cat == "all")
                    .collect(),
                None => all_rules,
            };

            match format.as_str() {
                "json" => {
                    println!("{}", serde_json::to_string_pretty(&filtered).unwrap());
                }
                _ => {
                    println!();
                    println!("{}", "╔════════════════════════════════════════════╗".bright_white());
                    println!("{}", "║           securify rule database           ║".bright_white());
                    println!("{}", "╚════════════════════════════════════════════╝".bright_white());
                    println!();
                    for rule in &filtered {
                        let severity_color = match rule.severity {
                            "critical" => "critical".red(),
                            "high" => "high".yellow(),
                            _ => "warning".normal(),
                        };
                        println!(" {}  {} ({})", "┌".bright_black(), rule.id.bright_white(), severity_color);
                        println!(" {}  name        : {}", "│".bright_black(), rule.name);
                        println!(" {}  category    : {}", "│".bright_black(), rule.category);
                        println!(" {}  pattern     : {}", "│".bright_black(), rule.pattern.cyan());
                        println!(" {}  {}", "└".bright_black(), "─".repeat(50).bright_black());
                        println!();
                    }
                    println!(" {} rules loaded: {}", "✔".green(), filtered.len());
                    println!();
                }
            }
        }
        Commands::InitHook { path } => {
            let target = path.unwrap_or_else(|| PathBuf::from("."));
            match hook::init_hook(&target) {
                Ok(msg) => {
                    println!(" {}", format!("✔ {}", msg).green());
                }
                Err(e) => {
                    eprintln!(" {}", format!("✖ {}", e).red());
                    std::process::exit(1);
                }
            }
        }
        Commands::RemoveHook { path } => {
            let target = path.unwrap_or_else(|| PathBuf::from("."));
            match hook::remove_hook(&target) {
                Ok(msg) => {
                    println!(" {}", format!("✔ {}", msg).green());
                }
                Err(e) => {
                    eprintln!(" {}", format!("✖ {}", e).red());
                    std::process::exit(1);
                }
            }
        }
        Commands::Entropy { input } => {
            let e = entropy::calculate_entropy(&input);
            let (strength, _) = entropy::get_strength_rating(e, input.len());
            let time = entropy::estimate_brute_force_time(e, input.len());

            println!();
            println!("{}", "╔════════════════════════════════════╗".bright_white());
            println!("{}", "║      securify entropy analysis     ║".bright_white());
            println!("{}", "╚════════════════════════════════════╝".bright_white());
            println!();
            println!("  input    : {}", input.cyan());
            println!("  entropy  : {} bits/symbol", e.to_string().white().bold());
            println!("  strength : {}", strength);
            println!("  brute-force estimate : {}", time);
            println!();
        }
    }
}
