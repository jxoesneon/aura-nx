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
TARGET		:=	aura_nx
BUILD		:=	build
SOURCES		:=	src
INCLUDES	:=	include
DATA		:=	data
ROMFS		:=	romfs

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

LIBS	:=	-lnx

#---------------------------------------------------------------------------------
# list of directories containing libraries, this must be before the library names
#---------------------------------------------------------------------------------
LIBDIRS	:=	$(LIBNX)

#---------------------------------------------------------------------------------
# no real need to edit anything past this point unless you need to add additional
# rules for different file extensions
#---------------------------------------------------------------------------------
ifneq ($(BUILD),$(notdir $(CURDIR)))
#---------------------------------------------------------------------------------

export OUTPUT	:=	$(CURDIR)/$(TARGET)
export TOPDIR	:=	$(CURDIR)

export VPATH	:=	$(foreach dir,$(SOURCES),$(CURDIR)/$(dir)) \
			$(foreach dir,$(DATA),$(CURDIR)/$(dir))

export DEPSDIR	:=	$(CURDIR)/$(BUILD)

CFILES		:=	$(foreach dir,$(SOURCES),$(wildcard $(dir)/*.c))
CPPFILES	:=	$(foreach dir,$(SOURCES),$(wildcard $(dir)/*.cpp))
SFILES		:=	$(foreach dir,$(SOURCES),$(wildcard $(dir)/*.s))
BINFILES	:=	$(foreach dir,$(DATA),$(wildcard $(dir)/*.*))

#---------------------------------------------------------------------------------
# use GPATH for source lookup if you want to separate source from build
#---------------------------------------------------------------------------------
#export GPATH	:=	$(VPATH)

#---------------------------------------------------------------------------------
# check for RomFS
#---------------------------------------------------------------------------------
ifneq ($(wildcard $(ROMFS)),)
	export build_romfs_bin := $(TOPDIR)/$(TARGET).romfs
endif

export OFILES	:=	$(CPPFILES:.cpp=.o) $(CFILES:.c=.o) $(SFILES:.s=.o) \
			$(BINFILES:.bin=.bin.o)

export INCLUDES	:=	$(foreach dir,$(INCLUDES),-I$(CURDIR)/$(dir)) \
			$(foreach dir,$(LIBDIRS),-I$(dir)/include) \
			-I$(LIBNX)/include

.PHONY: $(BUILD) clean all

#---------------------------------------------------------------------------------
all: $(BUILD)

$(BUILD):
	@[ -d $@ ] || mkdir -p $@
	@$(MAKE) --no-print-directory -C $(BUILD) -f $(CURDIR)/Makefile

#---------------------------------------------------------------------------------
clean:
	@echo clean ...
	@rm -rf $(BUILD) $(TARGET).elf $(TARGET).nso $(TARGET).nsp

#---------------------------------------------------------------------------------
else

DEPENDS	:=	$(OFILES:.o=.d)

#---------------------------------------------------------------------------------
# main targets
#---------------------------------------------------------------------------------
all	:	$(OUTPUT).nso $(OUTPUT).nsp

$(OUTPUT).nsp	:	$(OUTPUT).nso $(TOPDIR)/template.npdm
	@echo built ... $(notdir $@)
	@build_nsp $(OUTPUT).nso $(TOPDIR)/template.npdm $@

$(OUTPUT).nso	:	$(OUTPUT).elf

$(OUTPUT).elf	:	$(OFILES)

$(OFILES_BIN)	:	$(BINFILES)

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

-include $(DEPENDS)

#---------------------------------------------------------------------------------------
endif
#---------------------------------------------------------------------------------------
