CXX = g++
CXXFLAGS = -Wall -Wextra -I../../client-lib/include

vfs_logic: vfs_logic.cpp
	$(CXX) $(CXXFLAGS) -o $@ $<

test: vfs_logic
	./vfs_logic

clean:
	rm -f vfs_logic

.PHONY: test clean
