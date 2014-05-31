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

JS_FILES := $(shell find $(SOURCE)/**/*.js)

all: npm bower build

build: clean $(DEST)/med.js

$(DEST)/med.js:
	@$(COMPONMENT) build scripts -s Med -o ./tmp
	@mkdir $(DEST)
	@cat $(SOURCE)/header > $(DEST)/med.js
	@cat ./tmp/build.js >> $(DEST)/med.js
	@$(UGLIFY) $(DEST)/med.js -m -c --source-map=$(DEST)/med.map -o $(DEST)/med.min.js
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

test: clean lint npm bower
	@mkdir $(DEST)
	@$(BROWSERIFY) test/*.js > dist/test.js
	@$(SERVER) .

release:
	git checkout release
	-git merge master
	make
	git add .
	git commit -am 'release 0.0.'$(DATE)
	git tag -a '0.0.'$(DATE) -m '0.0.'$(DATE)': '$<
	git checkout master

.PHONY: build clean test
