NM = ./node_modules
BC = ./bower_components

UGLIFY = $(NM)/.bin/uglifyjs
ZUUL = $(NM)/.bin/zuul
BOWER = $(NM)/.bin/bower
ESLINT = $(NM)/.bin/eslint
SOURCE = ./src
DEST = ./dist

DATE = `date +'%Y%m%d'`

# js
JS_FILES := $(SOURCE)/exports.js\
	$(SOURCE)/utils.js\
	$(shell find $(SOURCE)/utils/*.js)\
	$(SOURCE)/keyboard.js\
	$(shell find $(SOURCE)/plugins/*.js)\
	$(SOURCE)/schema.js\
	$(SOURCE)/emitter.js\
	$(SOURCE)/caret.js\
	$(SOURCE)/middleware.js\
	$(SOURCE)/data.js\
	$(SOURCE)/observe.js\
	$(SOURCE)/figure.js\
	$(SOURCE)/figure_type.js\
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

build: build-test $(JS_FILE) $(JS_FILE_MIN);

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
		$(BOWER) i;\
	fi

clean:
	@if [ -d $(NM) ]; then\
		rm -r $(NM);\
	fi

	@if [ -d $(BC) ]; then\
		rm -r $(BC);\
	fi

	@if [ -d $(DEST) ]; then\
		rm -r $(DEST);\
	fi

lint: build
	@$(ESLINT) $(DEST)/med.js

test: bower lint
	@$(ZUUL) -- test/*.js

test-local: bower lint
	@$(ZUUL) --local 8080 -- test/*.js

release:
	git checkout release
	-git merge master
	make
	git add .
	git commit -am 'release 0.0.'$(DATE)
	git tag -a '0.0.'$(DATE) -m '0.0.'$(DATE)': '$<
	git checkout master

.PHONY: build clean test
