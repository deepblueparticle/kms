/**
 * Client application is runned in browser
 */
var Provider = require('../provider/api.client/index'),
GraphView = require('./view/graph/index'),
ListView = require('./view/list/index'),
Search = require('./ui/search/search'),
Selection = require('./behavior/selection'),
Utils = require('../core/util')

var Self = function (p) {
  var self = this
  self.p = p || {}
  self.selectors = {
    container: '.container',
    panel: '.panel',
  }
  self.elements = Utils.findElements('body', self.selectors)
  self.selection = new Selection

  var providerSet = {
    url: '/item'
  }
  self.provider = new Provider(providerSet)
  var graphViewSet = {
    container: self.elements.container,
    selection: self.selection,
    width: 1000,
    height: 1000,
  }
  var listViewSet = {
    container: self.elements.container,
    selection: self.selection,
    width: 1000,
    height: 1000,
  }

  self.selection.on('add', self._onSelect.bind(self))
  self.search = new Search({container: self.elements.panel})
  self.search.on('update', self._onSearch.bind(self))

  self.listView = new ListView(listViewSet)
  self.graphView = new GraphView(graphViewSet)

  //Can work only for small repos
  //self.provider.read().then(self._onLoad.bind(self))
}

Self.prototype._onSelect = function (selection) {
  var self = this
  //TODO multiple selected
  self.provider.request('getGraph', selection[0], 1)
    .then(function (graph) {
      var vGraph = self._convert(graph)
      self.graphView.render(vGraph)
    })
}

Self.prototype._onSearch = function (data) {
  var self = this
  self.provider.request('findItems', data.str, data.flags)
    .then(function (items) {
      self.listView.render(items)
    })
}
/**
 * Prepare suitable for api.client json
 */
Self.prototype._convert = function (graph) {
  var self = this
  var obj = {}
  obj.items = _.map(graph.getItemsMap(), function (value, key) {
    return {key: key, value: value}
  })
  obj.links = _.map(graph.getLinksArray(), function (link) {
    return {source: link[0], target: link[1]}
  })
  obj.edges = self._getEdges(obj.items, obj.links)
  return obj
}

Self.prototype._onLoad = function (graph) {
  var self = this
  self.graph = graph
  //var vGraph = self._convert(graph)
  //self.graphView.render(vGraph)
  //
  //TODO show visible items which user previously left
}
/**
 * convert d3.js compliant format
 */
Self.prototype._getVisible = function () {
  var items = []
  return items
}

Self.prototype._getEdges = function (items, links) {
  var self = this
  return _.map(links, function (link) {
    var sourceNode = items.filter(function(n) {
      return n.key === link.source
    })[0],
      targetNode = items.filter(function(n) {
        return n.key === link.target
      })[0]

    return {
      source: sourceNode,
      target: targetNode,
      value: link.Value
    }
  })
}

var templates = G.Templates
G = new Self
G.Templates = templates