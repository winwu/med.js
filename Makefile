NM := ./node_modules
BC := ./bower_components

UGLIFY := $(NM)/.bin/uglifyjs
ZUUL := $(NM)/.bin/zuul
BOWER := $(NM)/.bin/bower
ESLINT := $(NM)/.bin/eslint
COMPONMENT := $(NM)/.bin/component
BROWSERIFY := $(NM)/.bin/browserify
SERVER := $(NM)/.bin/http-server
SOURCE := ./src
DEST := ./dist

DATE := `date +'%Y%m%d'`
JS_FILES := $(shell find src -name "*.js")
FILE_NAME := med
JS_FILE := $(DEST)/$(FILE_NAME).js
JS_FILE_MIN := $(DEST)/$(FILE_NAME).min.js
JS_FILE_MAP := $(DEST)/$(FILE_NAME).map

all: clean npm bower build

build: create-folder $(JS_FILE)

$(JS_FILE): $(JS_FILES)
	@$(COMPONMENT) build scripts -s Med -o ./tmp
	@cat $(SOURCE)/header > $(JS_FILE)
	@cat ./tmp/build.js >> $(JS_FILE)
	@$(UGLIFY) $(JS_FILE) -m -c --source-map=$(JS_FILE_MAP) -o $(JS_FILE_MIN)
	@rm -r ./tmp

install-watch:
	@npm install git://github.com/visionmedia/watch.git
	@cd $(NM)/watch;\
		make install

watch:
	@watch make build

npm:
	@if [ ! -d $(NM) ]; then\
		npm i;\
	fi

bower:
	@if [ ! -d $(BC) ]; then\
		$(BOWER) i;\
	fi

clean:
	@if [ -d $(DEST) ]; then\
		rm -r $(DEST);\
	fi

lint:
	@$(ESLINT) $(SOURCE)

server:
	@$(SERVER) .

test: clean create-folder lint npm bower
	@$(BROWSERIFY) test/*.js > dist/test.js
	@$(SERVER) .

create-folder:
	@mkdir -p $(DEST)

pre-release: clean
	git checkout release
	-git merge master
	make
	git add .
	git commit -am 'release 0.0.'$(DATE)
	git tag -a '0.0.'$(DATE) -m '0.0.'$(DATE)': '$<
	git checkout master

.PHONY: build clean test
