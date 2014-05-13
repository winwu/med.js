NM = ./node_modules
BC = ./bower_components

UGLIFY = $(NM)/.bin/uglifyjs
ZUUL = $(NM)/.bin/zuul
BOWER = $(NM)/.bin/bower
SOURCE = ./src
DEST = ./dist

# js
JS_FILES := $(SOURCE)/exports.js\
	$(SOURCE)/utils.js\
	$(SOURCE)/keyboard.js\
	$(SOURCE)/middlewares.js\
	$(SOURCE)/schema.js\
	$(SOURCE)/emitter.js\
	$(SOURCE)/caret.js\
	$(SOURCE)/middleware.js\
	$(SOURCE)/data.js\
	$(SOURCE)/observe.js\
	$(SOURCE)/html_builder.js\
	$(SOURCE)/default_options.js\
	$(SOURCE)/editor.js

JS_HEADER := $(SOURCE)/header.js
JS_FOOTER := $(SOURCE)/footer.js

FILE_NAME := med
JS_FILE := $(DEST)/$(FILE_NAME).js
JS_TEST_FILE := $(DEST)/$(FILE_NAME).test.js
JS_FILE_MIN := $(DEST)/$(FILE_NAME).min.js
JS_FILE_MAP := $(DEST)/$(FILE_NAME).map

all: clean modules build;

build: create-folder $(JS_FILE) $(JS_FILE_MIN);

build-test: create-folder $(JS_TEST_FILE);

$(JS_FILE): $(JS_HEADER) $(JS_FILES) $(JS_FOOTER)
	@echo ' ' $@
	@cat $^ > $@

$(JS_TEST_FILE): $(JS_FILES)
	@echo ' ' $@
	@cat $^ > $@

$(JS_FILE_MIN): $(JS_FILE)
	@echo ' ' $@
	@$(UGLIFY) $(JS_FILE) -m -c --source-map=$(JS_FILE_MAP) -o $(JS_FILE_MIN)

install-watch:
	@npm install git://github.com/visionmedia/watch.git
	@cd $(NM)/watch;\
		make install

create-folder:
	@mkdir -p $(DEST)

watch:
	@watch make build

modules:
	@if [ ! -d $(NM) ]; then\
		npm i;\
	fi

bower:
	@if [ ! -d $(BC) ]; then\
		@$(BOWER) i;\
	fi

clean:
	@if [ -d $(DEST) ]; then\
		rm -r $(DEST);\
	fi

test: bower build-test
	@zuul -- test/*.js

test-local: bower build-test
	@zuul --local 8080 -- test/*.js

.PHONY: build clean test
