'use strict';

var plugins = module.exports = {};

plugins.commandA = require('./command-a');
plugins.preventDefault = require('./prevent-default');
plugins.createNewParagraph = require('./create-new-paragraph');
plugins.handleBackspace = require('./handle-backspace');
plugins.handleBlockquote = require('./handle-blockquote');
plugins.handleEmptyParagraph = require('./handle-empty-paragraph');
plugins.handleFigure = require('./handle-figure');
plugins.handleList = require('./handle-list');
plugins.handleParagraph = require('./handle-paragraph');
plugins.initContext = require('./init-context');
plugins.refocus = require('./refocus');
plugins.removeExtraNodes = require('./remove-extra-nodes');
plugins.removeInlineStyle = require('./remove-inline-style');
plugins.renameElements = require('./rename-elements');
