// @flow

import { observer } from 'mobx-react';
import { Component } from 'react';
import type { Node } from 'react';
import classnames from 'classnames';
import styles from './RawHash.scss';

type Props = {|
  +children: ?Node,
  +light: boolean,
  +className?: string,
|};

@observer
export default class RawHash extends Component<Props> {

  static defaultProps: {|className: void|} = {
    className: undefined
  }

  render(): Node {
    const addressClasses = classnames([
      styles.hash,
      this.props.light ? styles.lightColor : styles.darkColor,
      this.props.className
    ]);
    return (
      <span className={addressClasses}>{this.props.children}</span>
    );
  }
}
