#ifndef SHARED_MEMORY_H
#define SHARED_MEMORY_H

#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>
#include <cstring>
#include <iostream>

class SharedMemory {
public:
    SharedMemory(const char* name, size_t size);
    ~SharedMemory();

    void write(const void* data, size_t size);
    void read(void* buffer, size_t size);

private:
    const char* name;
    int shm_fd;
    void* ptr;
    size_t size;
};

#endif // SHARED_MEMORY_H
