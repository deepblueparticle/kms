/**
 * Client application is run in browser
 */
import uuid62 from '@graphiy/uuid62'
import { Actionman } from '@graphiy/actionman'
import Util from '@graphiy/util'
import Itemman from './ui/itemman'
import Menu from './ui/main-menu/menu'
import ActionsPanel from './ui/actions-panel/panel'
import './style/index.scss'

const _views = {
  /* eslint-disable */
  Graph: require('./view/graph/graph').default,
  List: require('./view/list/list').default,
  HtmlList: require('./view/list/htmlList').default,
  /* eslint-enable */
}

const _actions = [
  /* eslint-disable */
  require('./action/select/none').default,
  require('./action/select/invert').default,
  require('./action/select/children').default,
  require('./action/item/create').default,
  // require('./action/item/edit').default,
  // require('./action/item/save').default,
  require('./action/item/link').default,
  require('./action/item/unlink').default,
  require('./action/item/expand').default,
  // require('./action/item/hide').default,
  require('./action/item/remove').default,
  require('./action/item/savePosition').default,
  require('./action/item/deletePosition').default,
  require('./action/view/createView').default,
  /* eslint-enable */
]

export default class App {
  constructor () {
    this.defaultViews = [
      { type: 'Graph', context: ['00xVUNkOdwLlHwgwmhVIte'], depth: 1 },
      { type: 'List', context: ['00xVUNkOdwLlHwgwmhVIte'], depth: 1 },
    ]
    this.id = 'app'
    this.views = {}
    this.actionman = new Actionman()
    this.itemman = new Itemman({ app: this })
    this.itemman.on('repo:load', this._createViews.bind(this))
    this.elements = Util.findElements('body', this.selectors)

    this.itemman.loadRepo()

    this.viewSet = {
      actionman: this.actionman,
      itemman: this.itemman,
      container: this.elements.viewContainer,
    }

    this.actionsPanel = new ActionsPanel({
      container: this.elements.sidebar,
      actionman: this.actionman,
    })

    this.actionman.on('add', this.actionsPanel.addMenuItem.bind(this.actionsPanel))
    this.menu = new Menu({ container: this.elements.header })

    this.actions = _actions
    setTimeout(() => {
      _.each(this.actions, action => this.actionman.set(action, this, this.id))
    })
  }

  get selectors () {
    return {
      header: 'header',
      container: '.container',
      sidebar: '.sidebar',
      viewContainer: '.view-container',
    }
  }

  async _createViews () {
    let views = {}
    const graph = await this.itemman.reloadGraph(this.itemman.serviceItems.views)

    if (_.isEmpty(graph.getItemsMap())) {
      await Promise.all(this.defaultViews.map(async (view) => {
        const key = uuid62.v4()
        await this.itemman.initViewNode(view, key)
        views[key] = view
      }))
    } else {
      views = graph.getItemsMap()
      _.each(views, (view, key) => {
        this.itemman.viewItems.push(key)
        views[key] = JSON.parse(view)
      })
    }

    _.each(views, (view, key) => {
      this._createView(_.assign({ key }, view, this.viewSet))
    })
  }

  _createView (viewSet) {
    const viewType = viewSet.type
    const Klass = _views[viewType]
    const newView = new Klass(viewSet)
    this.views[viewSet.key] = newView
    this.currentView = newView
    this.currentView.on('focus', this._changeCurrentView, this)
    this.currentView.on('transform', this._viewTransform, this)
    this.currentView.on('closeView', this._viewClose, this)
    this.currentView.on('context:change', this.updateView, this)

    if (viewSet.selection === undefined) {
      this.currentView.selection.on('change', this.actionsPanel.update.bind(this.actionsPanel))
    }
    if (viewSet.fixedNodes === undefined) {
      this.currentView.fixedNodes.on('change', this.actionsPanel.update.bind(this.actionsPanel))
    }

    if (_.keys(this.views).length > 1) {
      _.each(this.views, (view, key) => {
        if (viewSet.key !== key && view.resize) {
          view.resize()
          // TODO view should manage its layout on its own
          // view.layout.size(view.p.width, view.p.height)
        }
      })
    }
  }

  _changeCurrentView (viewKey) {
    if (this.views[viewKey] && this.views[viewKey] !== this.currentView) {
      this.currentView = this.views[viewKey]
      this.actionsPanel.update.call(this.actionsPanel)
    }
  }

  async _viewTransform (viewKey, newType) {
    const viewSet = _.cloneDeep(this.viewSet)
    viewSet.container = undefined
    const $el = this.views[viewKey].$el
    const graph = this.views[viewKey].graph
    const coords = this.views[viewKey].coords
    const key = this.views[viewKey].key
    const selection = this.views[viewKey].selection
    const fixedNodes = this.views[viewKey].fixedNodes
    const context = this.views[viewKey].context
    const depth = this.views[viewKey].depth

    this.views[viewKey].off('focus', this._changeCurrentView, this)
    this.views[viewKey].off('transform', this._viewTransform, this)
    this.views[viewKey].off('closeView', this._viewClose, this)
    this.views[viewKey].off('context:change', this.updateView, this)
    delete this.views[viewKey]

    await this._createView(_.assign({
      key,
      type: newType,
      $el,
      graph,
      coords,
      selection,
      fixedNodes,
      context,
      depth,
      transform: true,
    }, viewSet))
    this.updateView()
  }

  _viewClose (viewKey) {
    this.views[viewKey].off('focus', this._changeCurrentView, this)
    this.views[viewKey].off('transform', this._viewTransform, this)
    this.views[viewKey].off('closeView', this._viewClose, this)
    this.views[viewKey].off('context:change', this.updateView, this)
    this.views[viewKey].removeListeners()
    this.views[viewKey].$el.remove()
    delete this.views[viewKey]
    this.itemman.removeItem(viewKey)
  }

  updateView () {
    const viewKey = this.currentView.key
    const type = this.currentView.constructor.name
    const context = this.currentView.context
    const depth = this.currentView.depth
    const value = JSON.stringify({
      type,
      context,
      depth,
    })
    this.itemman.saveItem(value, viewKey)
  }

  async createNewView () {
    const view = _.cloneDeep(this.defaultViews[0])
    const key = uuid62.v4()
    await this.itemman.initViewNode(view, key)
    this._createView(_.assign({ key }, view, this.viewSet))
  }
}

window.G = new App()
