#include "shared_memory.h"

SharedMemory::SharedMemory(const char* name, size_t size) : name(name), size(size) {
    shm_fd = shm_open(name, O_CREAT | O_RDWR, 0666);
    if (shm_fd == -1) {
        std::cerr << "Shared memory oluşturulamadı!\n";
        exit(1);
    }
    ftruncate(shm_fd, size);
    ptr = mmap(0, size, PROT_READ | PROT_WRITE, MAP_SHARED, shm_fd, 0);
}

SharedMemory::~SharedMemory() {
    munmap(ptr, size);
    close(shm_fd);
    shm_unlink(name);
}

void SharedMemory::write(const void* data, size_t size) {
    memcpy(ptr, data, size);
}

void SharedMemory::read(void* buffer, size_t size) {
    memcpy(buffer, ptr, size);
}
