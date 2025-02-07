#include "gameoflife.h"
#include <iostream>
#include <thread>
#include <chrono>

int main() {
    GameOfLife game(20, 10);

    for (int i = 0; i < 50; i++) {  // 50 adım simüle et
        system("clear");  // Windows'ta "cls" kullan
        game.printGrid();
        game.update();
        std::this_thread::sleep_for(std::chrono::milliseconds(200));
    }

    return 0;
}
