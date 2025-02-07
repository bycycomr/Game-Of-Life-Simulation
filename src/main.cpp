#include "gameoflife.h"
#include "shared_memory.h"
#include <iostream>
#include <thread>
#include <chrono>

#define SHM_NAME "/gameoflife_shm"
#define WIDTH 20
#define HEIGHT 10
#define SHM_SIZE WIDTH * HEIGHT * sizeof(int)

int main() {
    GameOfLife game(WIDTH, HEIGHT);
    SharedMemory shm(SHM_NAME, SHM_SIZE);

    for (int i = 0; i < 50; i++) {  // 50 adım simüle et
        system("clear");
        game.printGrid();
        game.update();

        std::vector<std::vector<int>> grid = game.getGrid();
        shm.write(grid.data(), SHM_SIZE);  // Grid'i shared memory'ye yaz
        
        std::this_thread::sleep_for(std::chrono::milliseconds(200));
    }

    return 0;
}
