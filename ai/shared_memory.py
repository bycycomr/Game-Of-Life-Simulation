import mmap
import numpy as np
import os

SHM_NAME = "/gameoflife_shm"
WIDTH = 20
HEIGHT = 10
SHM_SIZE = WIDTH * HEIGHT * 4  # int başına 4 byte

class SharedMemory:
    def __init__(self, name, size):
        self.name = name
        self.size = size
        self.fd = os.open(name, os.O_RDWR)
        self.mm = mmap.mmap(self.fd, size, mmap.MAP_SHARED, mmap.PROT_READ | mmap.PROT_WRITE)

    def read(self):
        self.mm.seek(0)
        data = np.frombuffer(self.mm.read(self.size), dtype=np.int32)
        return data.reshape((HEIGHT, WIDTH))

    def write(self, data):
        self.mm.seek(0)
        self.mm.write(data.astype(np.int32).tobytes())

    def close(self):
        self.mm.close()
        os.close(self.fd)

if __name__ == "__main__":
    shm = SharedMemory(SHM_NAME, SHM_SIZE)
    while True:
        grid = shm.read()
        print("\n".join("".join("█" if cell else " " for cell in row) for row in grid))
        print("\n" + "="*40)
