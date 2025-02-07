#ifndef GAMEOFLIFE_H
#define GAMEOFLIFE_H

#include <vector>

class GameOfLife {
public:
    GameOfLife(int width, int height);
    void update();
    void printGrid() const;

    std::vector<std::vector<int>> getGrid() const; // AI Modeli ile paylaşmak için

private:
    int width, height;
    std::vector<std::vector<int>> grid;
    std::vector<std::vector<int>> nextGrid;

    int countNeighbors(int x, int y) const;
};

#endif // GAMEOFLIFE_H
