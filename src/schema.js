var schema = {
  section: {
    type: 'section'
  },

  h1: {
    type: 'paragraph',
    text: 'content'
  },

  h2: {
    type: 'paragraph',
    text: 'content'
  },

  h3: {
    type: 'paragraph',
    text: 'content'
  },

  h4: {
    type: 'paragraph',
    text: 'content'
  },

  h5: {
    type: 'paragraph',
    text: 'content'
  },

  h6: {
    type: 'paragraph',
    text: 'content'
  },

  p: {
    type: 'paragraph',
    text: 'content'
  },

  blockquote: {
    type: 'paragraph',
    text: 'content',
    quoteTpye: 'dataset:type'
  },

  figure: {
    type: 'figure',
    figureType: 'dataset:type',
    content: 'dataset:content'
  },

  ol: {
    type: 'paragraphs'
  },

  ul: {
    type: 'paragraphs'
  },

  li: {
    type: 'paragraph',
    text: 'content'
  },

  a: {
    type: 'detail',
    href: 'attribute',
    title: 'attribute'
  },

  b: {
    type: 'detail'
  },

  i: {
    type: 'detail'
  },

  br: {
    type: 'detail'
  }
};

Object.keys(schema).forEach(function (tagName) {
  var tag = schema[tagName];
  var type = tag.type;
  var attrs = [];

  delete tag.type;

  Object.keys(tag).forEach(function (attrName) {
    var attr = tag[attrName];
    var args = attr.split(':');
    var attrType = args.shift();

    attrs.push({
      name: args[0] || attrName,
      type: attrType,
      args: args
    });
  });

  schema[tagName] = {
    type: type,
    attrs: attrs
  };
});
