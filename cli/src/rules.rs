use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub id: &'static str,
    pub name: &'static str,
    pub category: &'static str,
    pub severity: &'static str,
    pub description: &'static str,
    pub pattern: &'static str,
}

pub fn get_rules() -> Vec<Rule> {
    vec![
        Rule {
            id: "sec-001",
            name: "aws access key id",
            category: "cloud",
            severity: "critical",
            description: "amazon web services credentials used to manage cloud compute, storage, and IAM user policies.",
            pattern: r"AKIA[A-Z0-9]{16}",
        },
        Rule {
            id: "sec-002",
            name: "aws secret access key",
            category: "cloud",
            severity: "critical",
            description: "high-entropy signature key paired with access keys to sign AWS requests.",
            pattern: r"(?i)aws(.{0,20})?[0-9a-zA-Z\/+]{40}",
        },
        Rule {
            id: "sec-003",
            name: "supabase service role jwt",
            category: "database",
            severity: "critical",
            description: "supabase service_role json web tokens containing database root bypass permissions.",
            pattern: r"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+",
        },
        Rule {
            id: "sec-004",
            name: "stripe secret api key",
            category: "saas",
            severity: "critical",
            description: "stripe payment transaction private keys used to manage customer billing systems.",
            pattern: r"sk_(live|test)_[0-9a-zA-Z]{24}",
        },
        Rule {
            id: "sec-005",
            name: "github personal access token",
            category: "vcs",
            severity: "high",
            description: "github repository read/write access tokens linked to user accounts.",
            pattern: r"ghp_[a-zA-Z0-9]{36}",
        },
        Rule {
            id: "sec-006",
            name: "google cloud api key",
            category: "cloud",
            severity: "high",
            description: "static credentials access keys used across GCP services like Maps, Firebase, or Translation.",
            pattern: r"AIzaSy[a-zA-Z0-9-_]{33}",
        },
        Rule {
            id: "sec-007",
            name: "slack webhook incoming url",
            category: "saas",
            severity: "high",
            description: "slack channel integration URLs that allow unauthenticated chat message broadcasts.",
            pattern: r"https://hooks\.slack\.com/services/[A-Za-z0-9/]+",
        },
        Rule {
            id: "sec-008",
            name: "database connection string",
            category: "database",
            severity: "critical",
            description: "database connection URLs containing hardcoded credentials.",
            pattern: r"postgres(?:ql)?://([^:]+):([^@]+)@",
        },
        Rule {
            id: "sec-009",
            name: "ssh/rsa private key",
            category: "vcs",
            severity: "critical",
            description: "private SSH or RSA keys that grant server access.",
            pattern: r"-----BEGIN [A-Z ]+ PRIVATE KEY-----",
        },
    ]
}
