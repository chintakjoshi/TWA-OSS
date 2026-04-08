from pathlib import Path


def test_backend_dockerfile_copies_gtfs_feed_directory() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    dockerfile = (backend_dir / "Dockerfile").read_text(encoding="utf-8")

    assert "COPY data ./data" in dockerfile


def test_backend_dockerignore_does_not_exclude_gtfs_feed_directory() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    dockerignore = (backend_dir / ".dockerignore").read_text(encoding="utf-8")
    entries = [
        line.strip()
        for line in dockerignore.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]

    assert "data" not in entries
    assert (backend_dir / "data" / "metro_stl_gtfs.zip").exists()
