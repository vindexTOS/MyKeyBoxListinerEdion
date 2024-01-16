import time


class State:
    def __init__(self) -> None:
        self.door_status: list[int] = []
        self.last_updated: float = time.time() * 1000
        self.to_open: int | None = None
