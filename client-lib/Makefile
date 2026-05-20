#---------------------------------------------------------------------------------
# Aura-NX Client Library Makefile
#---------------------------------------------------------------------------------

ifeq ($(strip $(DEVKITPRO)),)
$(error "Please set DEVKITPRO in your environment. export DEVKITPRO=<path to>devkitPro")
endif

include $(DEVKITPRO)/libnx/switch_rules

TARGET		:=	aura-nx
SOURCES		:=	src
INCLUDES	:=	include
BUILD		:=	build
LIBDIR		:=	lib

# Compilation flags
ARCH		:=	-march=armv8-a+crc+crypto -mtune=cortex-a57 -mtp=soft -fPIC
CFLAGS		:=	-g -Wall -O2 -ffunction-sections $(ARCH)
CFLAGS		+=	-I$(CURDIR)/$(INCLUDES) -I$(LIBNX)/include
CXXFLAGS	:=	$(CFLAGS) -fno-rtti -fno-exceptions

# Source files
CFILES		:=	$(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.c)))
CPPFILES	:=	$(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.cpp)))
SFILES		:=	$(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.s)))

# Object files
OFILES		:=	$(addprefix $(BUILD)/,$(CPPFILES:.cpp=.o) $(CFILES:.c=.o) $(SFILES:.s=.o))

# Output library
OUTPUT		:=	$(LIBDIR)/lib$(TARGET).a

.PHONY: all clean

all: $(LIBDIR) $(BUILD) $(OUTPUT)

$(LIBDIR):
	@mkdir -p $@

$(BUILD):
	@mkdir -p $@

$(OUTPUT): $(OFILES)
	@echo Linking $@
	@$(AR) -rc $@ $^

$(BUILD)/%.o: src/%.cpp
	@echo Compiling $<
	@$(CXX) $(CXXFLAGS) -c $< -o $@

$(BUILD)/%.o: src/%.c
	@echo Compiling $<
	@$(CC) $(CFLAGS) -c $< -o $@

$(BUILD)/%.o: src/%.s
	@echo Assembling $<
	@$(AS) $(ASFLAGS) -c $< -o $@

clean:
	@echo Cleaning...
	@rm -rf $(BUILD) $(LIBDIR)
