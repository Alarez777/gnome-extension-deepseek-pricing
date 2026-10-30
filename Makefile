UUID := deepseek-pricing@alarez777.github.io
NAME := deepseek-pricing
DIST := dist
EXTENSIONS_DIR := $(HOME)/.local/share/gnome-shell/extensions
EXT_DIR := $(EXTENSIONS_DIR)/$(UUID)

GLIB_COMPILE_SCHEMAS ?= $(shell if [ -x /usr/bin/glib-compile-schemas ]; then echo /usr/bin/glib-compile-schemas; else command -v glib-compile-schemas; fi)

.PHONY: all build schemas pack test install verify-install uninstall clean distclean

all: build

.stamp-npm: package.json
	npm install
	@touch .stamp-npm

build: .stamp-npm
	rm -rf $(DIST)
	npm run build
	mkdir -p $(DIST)/icons $(DIST)/schemas
	cp metadata.json stylesheet.css $(DIST)/
	cp icons/*.svg $(DIST)/icons/
	cp schemas/*.gschema.xml $(DIST)/schemas/
	# Validate the XML without shipping the compiled cache: on GNOME 45+ the
	# installer compiles the schemas itself.
	$(GLIB_COMPILE_SCHEMAS) --strict --dry-run $(DIST)/schemas

schemas:
	$(GLIB_COMPILE_SCHEMAS) --strict schemas

pack: build
	@rm -f $(NAME).zip
	@cd $(DIST) && zip -9 -r ../$(NAME).zip . -x 'schemas/gschemas.compiled' >/dev/null
	@echo "Created $(NAME).zip"

test: .stamp-npm
	npm run check

install: build
	@mkdir -p "$(EXTENSIONS_DIR)"
	@rm -rf "$(EXT_DIR)"
	@cp -r "$(DIST)" "$(EXT_DIR)"
	@$(GLIB_COMPILE_SCHEMAS) --strict "$(EXT_DIR)/schemas"
	@$(MAKE) --no-print-directory verify-install
	@echo "Installed to $(EXT_DIR)"
	@echo "Enable it with: gnome-extensions enable $(UUID)"
	@echo ""
	@echo "GNOME Shell does not hot-reload extension code:"
	@echo "  Wayland: log out and back in"
	@echo "  X11: Alt+F2, type 'r' and press Enter"

verify-install:
	@test -d "$(EXT_DIR)" || { echo "Not installed: $(EXT_DIR)"; exit 1; }
	@diff -rq --exclude=gschemas.compiled "$(DIST)" "$(EXT_DIR)" >/dev/null || { echo "Installed copy differs from $(DIST). Run 'make install'."; exit 1; }
	@echo "Installed copy matches $(DIST)."

uninstall:
	@rm -rf "$(EXT_DIR)"
	@echo "Removed $(EXT_DIR)"

clean:
	rm -rf $(DIST) $(NAME).zip

distclean: clean
	rm -rf node_modules .stamp-npm
