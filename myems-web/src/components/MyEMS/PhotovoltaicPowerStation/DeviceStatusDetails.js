import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import { Card, CardBody, Table } from 'reactstrap';

const DeviceStatusDetails = ({ id, gatewayStatus, invertorStatus, gridMeterStatus, loadMeterStatus, t }) => {
  return (
    <Card className="mb-3 fs--1">
      <Fragment>
        <CardBody className="pt-0">
          <Table borderless className="fs--1 mb-0">
            <tbody>
              <tr className="border-bottom">
                <td className="pl-0 pb-0">{t('Gateway')}</td>
                <td className="pr-0 text-right">{gatewayStatus}正常</td>
              </tr>
              <tr className="border-bottom">
                <td className="pl-0">{t('Invertor')}</td>
                <td className="pr-0 text-right">{invertorStatus}正常</td>
              </tr>
              <tr className="border-bottom">
                <td className="pl-0 pb-0">{t('Grid Meter')}</td>
                <td className="pr-0 text-right">{gridMeterStatus}正常</td>
              </tr>
              <tr className="border-bottom">
                <td className="pl-0 pb-0">{t('Load Meter')}</td>
                <td className="pr-0 text-right">{loadMeterStatus}正常</td>
              </tr>
            </tbody>
          </Table>
        </CardBody>
      </Fragment>
    </Card>
  );
};

DeviceStatusDetails.propTypes = {
  id: PropTypes.number.isRequired,
  gateway_status: PropTypes.number,
  pcs_status: PropTypes.number,
  bms_status: PropTypes.number,
  hvac_status: PropTypes.number,
  grid_meter_status: PropTypes.number,
  load_meter_status: PropTypes.number
};

export default withTranslation()(DeviceStatusDetails);
