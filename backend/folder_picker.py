import subprocess

def pick_folder():
    try:
        result = subprocess.run(
            ['zenity', '--file-selection', '--directory', '--title=Select Project Folder'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except FileNotFoundError:
        pass
    return ""

if __name__ == "__main__":
    path = pick_folder()
    if path:
        print(path, end="")
