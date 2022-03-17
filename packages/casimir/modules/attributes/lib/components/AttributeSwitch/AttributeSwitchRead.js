import { defineComponent } from '@deip/platform-util';
import { AttributeReadMixin, AttributeOptionsReadMixin } from '../../mixins';

/**
 * Component for read only switch attribute
 */
export const AttributeSwitchRead = defineComponent({
  name: 'AttributeSwitchRead',

  mixins: [
    AttributeReadMixin,
    AttributeOptionsReadMixin
  ],

  methods: {
    /**
     * Generate switch attribute with list options for read only
     */
    genAttribute() {
      return (
        <div>{this.optionsValueTitles.join(', ')}</div>
      );
    }
  }
});
