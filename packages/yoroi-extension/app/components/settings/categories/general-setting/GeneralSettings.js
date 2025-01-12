// @flow
import { Component } from 'react';
import type { Node } from 'react';
import { observer } from 'mobx-react';
import classNames from 'classnames';
import Select from '../../../common/Select';
import { MenuItem, Typography } from '@mui/material';
import { intlShape } from 'react-intl';
import ReactToolboxMobxForm from '../../../../utils/ReactToolboxMobxForm';
import LocalizableError from '../../../../i18n/LocalizableError';
import styles from './GeneralSettings.scss';
import type { LanguageType } from '../../../../i18n/translations';
import FlagLabel from '../../../widgets/FlagLabel';
import { tier1Languages } from '../../../../config/languagesConfig';
import globalMessages, { listOfTranslators } from '../../../../i18n/global-messages';
import type { $npm$ReactIntl$IntlFormat } from 'react-intl';

type Props = {|
  +languages: Array<LanguageType>,
  +currentLocale: string,
  +onSelectLanguage: {| locale: string |} => PossiblyAsync<void>,
  +isSubmitting: boolean,
  +error?: ?LocalizableError,
|};

@observer
export default class GeneralSettings extends Component<Props> {
  static defaultProps: {|error: void|} = {
    error: undefined
  };

  static contextTypes: {|intl: $npm$ReactIntl$IntlFormat|} = {
    intl: intlShape.isRequired,
  };

  selectLanguage: string => Promise<void> = async (locale) => {
    await this.props.onSelectLanguage({ locale });
  };

  form: ReactToolboxMobxForm = new ReactToolboxMobxForm({
    fields: {
      languageId: {
        label: this.context.intl.formatMessage(globalMessages.languageSelectLabel),
        value: this.props.currentLocale,
      }
    }
  });

  render(): Node {
    const { languages, isSubmitting, error } = this.props;
    const { intl } = this.context;
    const { form } = this;
    const languageId = form.$('languageId');
    const languageOptions = languages.map(language => ({
      value: language.value,
      label: intl.formatMessage(language.label),
      svg: language.svg
    }));
    const componentClassNames = classNames([styles.component, 'general']);

    return (
      <div className={componentClassNames}>
        <Select
          labelId="languages-select"
          {...languageId.bind()}
          onChange={this.selectLanguage}
          disabled={isSubmitting}
          renderValue={value => (
            <Typography variant="body2">
              {languageOptions.filter(item => item.value === value)[0].label}
            </Typography>
          )}
        >
          {languageOptions.map(option => (
            <MenuItem key={option.value} value={option.value}>
              <FlagLabel svg={option.svg} label={option.label} />
            </MenuItem>
          ))}
        </Select>
        {error && <p className={styles.error}>{intl.formatMessage(error, error.values)}</p>}

        {!tier1Languages.includes(languageId.value) &&
          <div className={styles.info}>
            <h1>{intl.formatMessage(globalMessages.languageSelectLabelInfo)}</h1>
            <p>
              {intl.formatMessage(globalMessages.languageSelectInfo)}
              {' '}
              {listOfTranslators(intl.formatMessage(globalMessages.translationContributors),
                intl.formatMessage(globalMessages.translationAcknowledgment))}
            </p>
          </div>
        }

      </div>
    );
  }
}
