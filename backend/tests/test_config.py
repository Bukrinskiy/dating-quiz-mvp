from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import _settings_env_files


def test_settings_env_files_include_repo_root_before_backend_env() -> None:
    env_files = _settings_env_files()

    assert env_files[0].endswith("/dating-quiz-mvp/.env")
    assert env_files[1].endswith("/dating-quiz-mvp/backend/.env")
