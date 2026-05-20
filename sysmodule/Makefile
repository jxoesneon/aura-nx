#---------------------------------------------------------------------------------
# Clear the implicit built in rules
#---------------------------------------------------------------------------------
.SUFFIXES:

#---------------------------------------------------------------------------------
ifeq ($(strip $(DEVKITPRO)),)
$(error "Please set DEVKITPRO in your environment. export DEVKITPRO=<path to>devkitPRO")
endif

include $(DEVKITPRO)/libnx/switch_rules

#---------------------------------------------------------------------------------
# TARGET is the name of the output
# BUILD is the directory where object files & intermediate files will be placed
# SOURCES is a list of directories containing source code
# INCLUDES is a list of directories containing extra header files
# DATA is a list of directories containing binary data
# ROMFS is the directory containing data to be added to RomFS, relative to the project root
#---------------------------------------------------------------------------------
SYSMODULE_TARGET	:=	aura_nx_sysmodule
COMPANION_TARGET	:=	aura_nx_companion
SOURCES				:=	src
INCLUDES			:=	include
DATA				:=	data
ROMFS				:=	romfs

#---------------------------------------------------------------------------------
# options for code generation
#---------------------------------------------------------------------------------
ARCH	:=	-march=armv8-a+crc+crypto -mtune=cortex-a57 -mtp=soft -fPIE

CFLAGS	:=	-g -Wall -O2 -ffunction-sections \
			$(ARCH) $(DEFINES)

CFLAGS	+=	$(foreach dir,$(INCLUDES),-I$(CURDIR)/$(dir)) \
			$(foreach dir,$(LIBDIRS),-I$(dir)/include) \
			-I$(LIBNX)/include

CXXFLAGS	:= $(CFLAGS) -fno-rtti -fno-exceptions -std=gnu++17

ASFLAGS	:=	-g $(ARCH)
LDFLAGS	:=	-specs=$(LIBNX)/switch.specs -g $(ARCH) -Wl,-Map,$(notdir $*.map)

LIBS	:=	-L$(LIBNX)/lib -lnx

#---------------------------------------------------------------------------------
# list of directories containing libraries, this must be before the library names
#---------------------------------------------------------------------------------
LIBDIRS	:=	$(LIBNX)

#---------------------------------------------------------------------------------
ifeq ($(strip $(TYPE)),)
#---------------------------------------------------------------------------------

export TOPDIR	:=	$(CURDIR)

.PHONY: all clean sysmodule companion

all: sysmodule companion

sysmodule:
	@[ -d build_sysmodule ] || mkdir -p build_sysmodule
	@$(MAKE) --no-print-directory -C build_sysmodule -f $(CURDIR)/Makefile TARGET=$(SYSMODULE_TARGET) TYPE=SYSMODULE

companion:
	@[ -d build_companion ] || mkdir -p build_companion
	@$(MAKE) --no-print-directory -C build_companion -f $(CURDIR)/Makefile TARGET=$(COMPANION_TARGET) TYPE=COMPANION

clean:
	@echo clean ...
	@rm -rf build_sysmodule build_companion $(SYSMODULE_TARGET).nsp $(COMPANION_TARGET).nro $(SYSMODULE_TARGET).elf $(COMPANION_TARGET).elf $(SYSMODULE_TARGET).nso

#---------------------------------------------------------------------------------
else
#---------------------------------------------------------------------------------

export OUTPUT	:=	$(TOPDIR)/$(TARGET)

export VPATH	:=	$(foreach dir,$(SOURCES),$(TOPDIR)/$(dir)) \
			$(foreach dir,$(DATA),$(TOPDIR)/$(dir))

export DEPSDIR	:=	$(CURDIR)

ifeq ($(TYPE),SYSMODULE)
    # Sysmodule includes everything except companion_main.cpp
    CPPFILES := $(filter-out %companion_main.cpp, $(foreach dir,$(SOURCES),$(wildcard $(TOPDIR)/$(dir)/*.cpp)))
    CFILES   := $(foreach dir,$(SOURCES),$(wildcard $(TOPDIR)/$(dir)/*.c))
    SFILES   := $(foreach dir,$(SOURCES),$(wildcard $(TOPDIR)/$(dir)/*.s))
else
    # Companion only includes companion_main.cpp
    CPPFILES := $(foreach dir,$(SOURCES),$(wildcard $(TOPDIR)/$(dir)/companion_main.cpp))
    CFILES   := 
    SFILES   := 
endif

BINFILES	:=	$(foreach dir,$(DATA),$(wildcard $(TOPDIR)/$(dir)/*.*))

# Filter out the directory part for OFILES to keep them in the current (build) directory
export OFILES	:=	$(notdir $(CPPFILES:.cpp=.o)) $(notdir $(CFILES:.c=.o)) $(notdir $(SFILES:.s=.o)) \
			$(notdir $(BINFILES:.bin=.bin.o))

export INCLUDES	:=	$(foreach dir,$(INCLUDES),-I$(TOPDIR)/$(dir)) \
			$(foreach dir,$(LIBDIRS),-I$(dir)/include) \
			-I$(LIBNX)/include

.PHONY: all

#---------------------------------------------------------------------------------
# main targets
#---------------------------------------------------------------------------------
ifeq ($(TYPE),SYSMODULE)
all	:	$(OUTPUT).nsp

$(OUTPUT).nsp	:	$(OUTPUT).nso $(TOPDIR)/template.npdm
	@echo built ... $(notdir $@)
	@$(DEVKITPRO)/tools/bin/build_nsp $(OUTPUT).nso $(TOPDIR)/template.npdm $@

$(OUTPUT).nso	:	$(OUTPUT).elf
else
all	:	$(OUTPUT).nro

$(OUTPUT).nro	:	$(OUTPUT).elf
endif

$(OUTPUT).elf	:	$(OFILES)
	@echo linking $(notdir $@)
	@$(CXX) $(LDFLAGS) $(OFILES) $(LIBS) -o $@


#---------------------------------------------------------------------------------
# recipes for compiling
#---------------------------------------------------------------------------------
%.o: %.cpp
	@echo $(notdir $<)
	@$(CXX) -MMD -MP -MF $(DEPSDIR)/$*.d $(CXXFLAGS) -c $< -o $@ $(ERROR_FILTER)

%.o: %.c
	@echo $(notdir $<)
	@$(CC) -MMD -MP -MF $(DEPSDIR)/$*.d $(CFLAGS) -c $< -o $@ $(ERROR_FILTER)

%.o: %.s
	@echo $(notdir $<)
	@$(AS) $(ASFLAGS) $< -o $@ $(ERROR_FILTER)

-include $(notdir $(OFILES:.o=.d))

#---------------------------------------------------------------------------------------
endif
#---------------------------------------------------------------------------------------
