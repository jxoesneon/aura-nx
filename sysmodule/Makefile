#---------------------------------------------------------------------------------
# TARGET is the name of the output
#---------------------------------------------------------------------------------
SYSMODULE_TARGET	:=	aura_nx_sysmodule
COMPANION_TARGET	:=	aura_nx_companion

#---------------------------------------------------------------------------------
# Options for code generation
#---------------------------------------------------------------------------------
ARCH	:=	-march=armv8-a+crc+crypto -mtune=cortex-a57 -mtp=soft -fPIE

ifeq ($(strip $(DEVKITPRO)),)
$(error "Please set DEVKITPRO in your environment.")
endif

include $(DEVKITPRO)/libnx/switch_rules

# Use the cross-compiler for linking to avoid host ld issues
LD	:=	$(CXX)

SOURCES		:=	src
INCLUDES	:=	include
DATA		:=	data

CFLAGS	:=	-g -Wall -O2 -ffunction-sections \
			$(ARCH) $(DEFINES)

CFLAGS	+=	-I$(CURDIR)/$(INCLUDES) -I$(LIBNX)/include

CXXFLAGS	:= $(CFLAGS) -fno-rtti -fno-exceptions -std=gnu++17

ASFLAGS	:=	-g $(ARCH)
LDFLAGS	:=	-specs=$(LIBNX)/switch.specs -g $(ARCH) -Wl,-Map,$(notdir $*.map)

LIBS	:=	-L$(LIBNX)/lib -lnx

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
	@rm -rf build_sysmodule build_companion $(SYSMODULE_TARGET).nsp $(COMPANION_TARGET).nro $(SYSMODULE_TARGET).elf $(COMPANION_TARGET).elf $(SYSMODULE_TARGET).nso $(SYSMODULE_TARGET).map $(COMPANION_TARGET).map

#---------------------------------------------------------------------------------
else
#---------------------------------------------------------------------------------

export OUTPUT	:=	$(TOPDIR)/$(TARGET)
export VPATH	:=	$(foreach dir,$(SOURCES),$(TOPDIR)/$(dir))

ifeq ($(TYPE),SYSMODULE)
    CPPFILES := $(filter-out %companion_main.cpp, $(foreach dir,$(SOURCES),$(wildcard $(TOPDIR)/$(dir)/*.cpp)))
else
    CPPFILES := $(foreach dir,$(SOURCES),$(wildcard $(TOPDIR)/$(dir)/companion_main.cpp))
endif

export OFILES	:=	$(notdir $(CPPFILES:.cpp=.o))

.PHONY: all

ifeq ($(TYPE),SYSMODULE)
all	:	$(OUTPUT).nso

$(OUTPUT).nso	:	$(OUTPUT).elf
else
all	:	$(OUTPUT).nro

$(OUTPUT).nro	:	$(OUTPUT).elf
endif

$(OUTPUT).elf	:	$(OFILES)
	@echo linking $(notdir $@)
	@$(LD) $(LDFLAGS) $(OFILES) $(LIBS) -o $@

%.o: %.cpp
	@echo $(notdir $<)
	@$(CXX) -MMD -MP -MF $*.d $(CXXFLAGS) -c $< -o $@

-include $(OFILES:.o=.d)

#---------------------------------------------------------------------------------------
endif
#---------------------------------------------------------------------------------------
