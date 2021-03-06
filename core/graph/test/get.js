import assert from 'assert'
import _ from 'lodash' // eslint-disable-line
import Graph from '../index'

describe('Graph', () => {
  describe('get subGraph', () => {
    let graph
    /**
      i1 - i2
      i1 - i3
    */
    const obj = {
      items: {
        i1: 1,
        i2: 2,
        i3: 3,

        // this value is left blank intentionally
        i4: '',
        i5: 5,
      },
      links: {
        i1: [['i2', 0], ['i3', 0]],
        i2: [['i1', 0], ['i3', 0]],
        i3: [['i1', 0], ['i2', 0], ['i4', 0]],
        i4: [['i3', 0], ['i5', 0]],
        i5: [['i4', 0]],
      },
    }
    beforeEach(() => {
      graph = new Graph(obj)
    })
    it('should return graph with only one item for default 0 depth', () => {
      const subGraph = graph.getGraph('i3')
      assert.equal(subGraph.getItemKeys().length, 1)
      assert.equal(subGraph.getLinksArray().length, 0)
    })
    it('should return subGraph with item and linked to it for depth 1', () => {
      const subGraph = graph.getGraph('i1', 1)
      assert.equal(subGraph.getItemKeys().length, 3)
      assert.deepEqual(subGraph.getLinksArray(), [['i1', 'i2'], ['i1', 'i3'], ['i2', 'i3']])
    })
    it('should return graph with two items for requested array with depth 0', () => {
      const subGraph = graph.getGraph(['i1', 'i4'])
      assert.deepEqual(subGraph.getItemKeys(), ['i1', 'i4'])
      assert.equal(subGraph.getLinksArray().length, 0)
    })
    /* eslint-disable indent */
    it(`should return graph with two items and links between them
       for requested array with depth 0`, () => {
      const subGraph = graph.getGraph(['i2', 'i3'])
      assert.equal(subGraph.getLinksArray().length, 1)
    })
    /* eslint-enable indent */
    it('should return subGraph with all items and linked to it for depth 1', () => {
      const subGraph = graph.getGraph(['i1', 'i5'], 1)
      assert.equal(subGraph.getItemKeys().length, 5)
      assert.equal(subGraph.getLink('i3', 'i4'), 0)
    })
  })
})
