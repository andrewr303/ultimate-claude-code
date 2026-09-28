STATUSES = {
    "PROJECT": {"draft", "active", "archived"},
    "BRIEF": {"draft", "aligned", "superseded"},
    "EPIC": {"framing", "ready", "in-progress", "done"},
    "REQ": {
        "idea",
        "framing",
        "specified",
        "ready",
        "blocked",
        "in-progress",
        "review",
        "done",
        "cancelled",
    },
    "TASK": {"planned", "ready", "blocked", "in-progress", "done", "sent-back", "cancelled"},
    "CHANGE": {"proposed", "specified", "applying", "verifying", "archived"},
    "CTX": set(),
}

EFFORTS = {"low", "med", "high"}
CTX_LEVELS = {"company", "project", "plan"}
CTX_KINDS = {"code", "business"}
CTX_TYPES = {"repo", "document", "pasted", "website", "transcript", "mcp"}
TRUTHY = {"true", "yes", "1"}
CODEBASE_MARKERS = (
    "package.json",
    "pyproject.toml",
    "go.mod",
    "Cargo.toml",
    "src",
    "app",
)
