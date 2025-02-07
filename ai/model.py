import os
import mmap
import numpy as np
import time
import torch
import torch.nn as nn

# Shared Memory parametreleri
SHM_NAME = "/gameoflife_shm"
WIDTH = 20
HEIGHT = 10
SHM_SIZE = WIDTH * HEIGHT * 4  # int32 için: 4 byte

# POSIX Shared Memory ile işlemleri yöneten sınıf
class SharedMemory:
    def __init__(self, name, size):
        self.name = name
        self.size = size
        # Okuma ve yazma izniyle shared memory'yi açıyoruz
        self.fd = os.open(name, os.O_RDWR)
        self.mm = mmap.mmap(self.fd, size, mmap.MAP_SHARED, mmap.PROT_READ | mmap.PROT_WRITE)

    def read(self):
        self.mm.seek(0)
        data = self.mm.read(self.size)
        grid = np.frombuffer(data, dtype=np.int32).reshape((HEIGHT, WIDTH))
        return grid

    def write(self, data):
        self.mm.seek(0)
        self.mm.write(data.astype(np.int32).tobytes())
        self.mm.flush()

    def close(self):
        self.mm.close()
        os.close(self.fd)

# Basit bir AI modeli tanımlayalım: Grid verisini alıp tek bir skor üretsin.
class SimpleAIModel(nn.Module):
    def __init__(self, input_dim, output_dim):
        super(SimpleAIModel, self).__init__()
        self.fc = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, output_dim)
        )

    def forward(self, x):
        return self.fc(x)

if __name__ == "__main__":
    # Shared memory objemizi oluşturalım.
    shm = SharedMemory(SHM_NAME, SHM_SIZE)
    
    # Model parametreleri: Grid'i düzleştirdiğimizde boyutu WIDTH*HEIGHT
    input_dim = WIDTH * HEIGHT
    output_dim = 1  # Örneğin, grid'in "yaşam skoru" gibi tek bir değer üretelim.
    model = SimpleAIModel(input_dim, output_dim)
    
    # Modeli değerlendirme moduna alıyoruz (eğitim yapılmayacak, sadece inference)
    model.eval()

    try:
        while True:
            # Shared memory'den grid verisini oku
            grid = shm.read()
            print("Game of Life Grid:")
            for row in grid:
                print("".join("█" if cell else " " for cell in row))
            print("-" * 40)
            
            # Grid verisini flatten edip, torch tensor'a dönüştür
            grid_tensor = torch.tensor(grid.flatten(), dtype=torch.float32).unsqueeze(0)  # [1, input_dim]
            
            with torch.no_grad():
                prediction = model(grid_tensor)
            
            # Modelin ürettiği skoru al (eğer tek bir değer üretiyorsa)
            score = prediction.item()
            print("AI Model Prediction (Score):", score)
            print("=" * 40)
            
            # (Opsiyonel) Model çıktısını tekrar shared memory'ye yazmak istersen,
            # örneğin tüm grid'i model çıktısına göre güncellemek için:
            # new_grid = np.full((HEIGHT, WIDTH), int(score) % 2, dtype=np.int32)
            # shm.write(new_grid)
            
            time.sleep(1)  # 1 saniyede bir güncelle
    except KeyboardInterrupt:
        print("Çıkılıyor...")
    finally:
        shm.close()
