# Makefile.inc — Shared Playdate SDK detection + utility targets
#
# Include this from your game's Makefile AFTER setting SRC and UINCDIR.
# Provides SDK detection and compile_commands target.
#
# Usage in a consuming Makefile:
#   PDK = pd-kit
#   VPATH += src:$(PDK)/src
#   SRC = src/main.c src/draw.c ... $(PDK)/src/pdk_crank.c ...
#   UINCDIR = src $(PDK)/src $(PDK)/include
#   include $(PDK)/Makefile.inc
#   include $(SDK)/C_API/buildsupport/common.mk

# ── SDK detection ───────────────────────────────────────────────────
SDK ?= ${PLAYDATE_SDK_PATH}
ifeq ($(SDK),)
	SDK = $(shell egrep '^\s*SDKRoot' ~/.Playdate/config | head -n 1 | cut -c9-)
endif

ifeq ($(SDK),)
$(error SDK path not found; set ENV value PLAYDATE_SDK_PATH)
endif

# ── Generate compile_commands.json for clangd ───────────────────────
# Re-run this target whenever you add new source files to SRC.
.PHONY: compile_commands
compile_commands:
	@echo '[' > compile_commands.json
	@first=true; \
	for src in $(SRC); do \
		if [ "$$first" = true ]; then first=false; else echo ',' >> compile_commands.json; fi; \
		echo '  {' >> compile_commands.json; \
		echo '    "directory": "$(CURDIR)",' >> compile_commands.json; \
		echo '    "file": "'$$src'",' >> compile_commands.json; \
		echo '    "arguments": ["clang", "-g", "-isysroot", "$(shell xcrun --show-sdk-path)", "-DTARGET_SIMULATOR=1", "-DTARGET_EXTENSION=1", "-I", ".", "-I", "$(SDK)/C_API"$(foreach d,$(UINCDIR), , "-I", "$(d)"), "-c", "'$$src'"]' >> compile_commands.json; \
		echo '  }' >> compile_commands.json; \
	done
	@echo ']' >> compile_commands.json
	@echo "Generated compile_commands.json"
