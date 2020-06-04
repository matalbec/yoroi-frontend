// @flow
import React, { Component } from 'react';
import type { Node } from 'react';
import { observer } from 'mobx-react';
import { defineMessages, intlShape, FormattedMessage } from 'react-intl';
import classNames from 'classnames';
import LoadingSpinner from '../widgets/LoadingSpinner';
import styles from './Loading.scss';
import LocalizableError from '../../i18n/LocalizableError';
import globalMessages from '../../i18n/global-messages';
import type { $npm$ReactIntl$IntlFormat } from 'react-intl';
import IntroBanner from '../profile/language-selection/IntroBanner';
import { environment } from '../../environment';

const messages = defineMessages({
  loading: {
    id: 'loading.screen.loading',
    defaultMessage: '!!!loading components',
  },
  error: {
    id: 'loading.screen.error',
    defaultMessage: '!!!For more help, you can {supportRequestLink}',
  },
});

type Props = {|
  +isLoadingDataForNextScreen: boolean,
  +hasLoadedCurrentLocale: boolean,
  +hasLoadedCurrentTheme: boolean,
  +error: ?LocalizableError,
  +onExternalLinkClick: MouseEvent => void,
  +downloadLogs: void => void
|};

@observer
export default class Loading extends Component<Props> {

  static contextTypes: {|intl: $npm$ReactIntl$IntlFormat|} = {
    intl: intlShape.isRequired,
  };

  render(): Node {
    const { intl } = this.context;
    const {
      isLoadingDataForNextScreen,
      hasLoadedCurrentLocale,
      hasLoadedCurrentTheme,
      error
    } = this.props;

    const componentStyles = classNames([
      styles.component,
    ]);
    const yoroiLogoStyles = classNames([
      styles.yoroiLogo,
      hasLoadedCurrentTheme ? null : styles.hide,
    ]);
    const renderError = error == null || !hasLoadedCurrentLocale
      ? null
      : (
        <div className={styles.loading}>
          <h1 className={styles.error}>
            {intl.formatMessage(error)}<br /><br />
            {this._getErrorMessageComponent()}
          </h1>
        </div>
      );
    const renderContent = (error != null || !isLoadingDataForNextScreen)
      ? null
      : (
        <div className={styles.loading}>
          {hasLoadedCurrentLocale && (
            <h1 className={styles.headline}>
              {intl.formatMessage(messages.loading)}
            </h1>
          )}
          <LoadingSpinner />
        </div>
      );
    return (
      <div className={componentStyles}>
        <div className={yoroiLogoStyles}>
          <IntroBanner
            isNightly={environment.isNightly()}
            isShelley={environment.isShelley()}
          />
        </div>

        {renderContent}
        {renderError}
      </div>
    );
  }

  _getErrorMessageComponent: (void => Node) = () => {
    const { intl } = this.context;
    const {
      onExternalLinkClick,
      downloadLogs
    } = this.props;

    const downloadLogsLink = (
      // eslint-disable-next-line jsx-a11y/anchor-is-valid
      <a
        className={styles.link}
        href="#"
        onClick={_event => downloadLogs()}
      >
        {intl.formatMessage(globalMessages.downloadLogsLink)}
      </a>
    );

    const supportRequestLink = (
      <a
        className={styles.link}
        href={intl.formatMessage(globalMessages.supportRequestLinkUrl)}
        onClick={event => onExternalLinkClick(event)}
      >
        {intl.formatMessage(globalMessages.contactSupport)}
      </a>
    );

    return (
      <p>
        <FormattedMessage {...globalMessages.logsContent} values={{ downloadLogsLink }} /><br />
        <FormattedMessage {...messages.error} values={{ supportRequestLink }} />
      </p>
    );
  };

}
