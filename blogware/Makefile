src  = ./src
dest = ../blog

vpath %.scss ${src}/css

post_targets = $(patsubst $(src)/posts/%.md,$(dest)/posts/%/index.html,$(wildcard $(src)/posts/*.md))
page_targets = $(patsubst $(src)/pages/%.md,$(dest)/pages/%/index.html,$(wildcard $(src)/pages/*.md))

css_sources = $(subst $(wildcard $(src)/css/_*.scss),,$(wildcard $(src)/css/*.scss))
css_targets = $(patsubst $(src)/css/%.scss,$(dest)/css/%.css,$(css_sources))

build: prepare_dir $(css_targets) $(page_targets) $(post_targets)
	@rsync -a --out-format="Copying $(src)/%n" --exclude=*.scss --exclude=*.md $(src)/* $(dest)

prepare_dir:
	@mkdir -p $(dest)/css
	@mkdir -p $(dest)/pages
	@mkdir -p $(dest)/posts

$(dest)/posts/%/index.html: $(src)/posts/%.md
	@echo Building $<
	@node makeentry.js -i $< -o $@

$(dest)/pages/%/index.html: $(src)/pages/%.md
	@echo Building $<
	@node makeentry.js -i $< -o $@

$(dest)/css/%.css: $(src)/css/%.scss $(wildcard $(src)/css/_*.scss)
	@echo Building $<
	@scss -E UTF-8 --no-cache $< > $@

clean:
	@read -p "Are you sure [y]?" confirm; test "$$confirm" = "y" && rm -rf $(dest)/* || echo "Clean action cancelled."
