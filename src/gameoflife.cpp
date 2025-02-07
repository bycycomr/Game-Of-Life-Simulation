#include "gameoflife.h"
#include <iostream>

GameOfLife::GameOfLife(int width, int height) : width(width), height(height) {
    grid = std::vector<std::vector<int>>(height, std::vector<int>(width, 0));
    nextGrid = grid;

    // Rastgele başlangıç durumu
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            grid[y][x] = rand() % 2;
        }
    }
}

void GameOfLife::update() {
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int neighbors = countNeighbors(x, y);
            if (grid[y][x] == 1) {
                nextGrid[y][x] = (neighbors == 2 || neighbors == 3) ? 1 : 0;
            } else {
                nextGrid[y][x] = (neighbors == 3) ? 1 : 0;
            }
        }
    }
    grid = nextGrid;
}

void GameOfLife::printGrid() const {
    for (const auto& row : grid) {
        for (int cell : row) {
            std::cout << (cell ? "█" : " ") << " ";
        }
        std::cout << "\n";
    }
    std::cout << std::endl;
}

int GameOfLife::countNeighbors(int x, int y) const {
    int count = 0;
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            int nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                count += grid[ny][nx];
            }
        }
    }
    return count;
}

std::vector<std::vector<int>> GameOfLife::getGrid() const {
    return grid;
}
