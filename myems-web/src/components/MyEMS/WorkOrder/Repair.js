import React, { createRef, Fragment, useEffect, useState } from 'react';
import paginationFactory, { PaginationProvider } from 'react-bootstrap-table2-paginator';
import BootstrapTable from 'react-bootstrap-table-next';
import { toast } from 'react-toastify';
import {
  Breadcrumb,
  BreadcrumbItem,
  Row,
  Col,
  Card,
  CardBody,
  Button,
  ButtonGroup,
  Form,
  FormGroup,
  Label,
  CustomInput,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  InputGroup,
  UncontrolledDropdown,
  Spinner
} from 'reactstrap';
import CountUp from 'react-countup';
import CardSummary from '../common/CardSummary';
import ButtonIcon from '../../common/ButtonIcon';
import Badge from 'reactstrap/es/Badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FalconCardHeader from '../../common/FalconCardHeader';
import { getPaginationArray } from '../../../helpers/utils';
import { getCookieValue, createCookie } from '../../../helpers/utils';
import withRedirect from '../../../hoc/withRedirect';
import { withTranslation } from 'react-i18next';
import moment from 'moment';
import { APIBaseURL, settings } from '../../../config';
import DateRangePickerWrapper from '../common/DateRangePickerWrapper';
import { endOfDay } from 'date-fns';

const WorkOrderRepair = ({ setRedirect, setRedirectUrl, t }) => {
  let current_moment = moment();

  // Query Parameters
  const [priority, setPriority] = useState('all');
  const [status, setStatus] = useState('all');
  const [reportingPeriodDateRange, setReportingPeriodDateRange] = useState([
    current_moment
      .clone()
      .startOf('month')
      .toDate(),
    current_moment.toDate()
  ]);
  const dateRangePickerLocale = {
    sunday: t('sunday'),
    monday: t('monday'),
    tuesday: t('tuesday'),
    wednesday: t('wednesday'),
    thursday: t('thursday'),
    friday: t('friday'),
    saturday: t('saturday'),
    ok: t('ok'),
    today: t('today'),
    yesterday: t('yesterday'),
    hours: t('hours'),
    minutes: t('minutes'),
    seconds: t('seconds'),
    last7Days: t('last7Days'),
    formattedMonthPattern: 'yyyy-MM-dd'
  };
  const dateRangePickerStyle = { display: 'block', zIndex: 10 };
  //Results
  const [faults, setFaults] = useState([]);
  const [excelBytesBase64, setExcelBytesBase64] = useState(undefined);
  const [totalFaultNumber, setTotalFaultNumber] = useState({});
  const [newFaultNumber, setNewFaultNumber] = useState({});
  const [inprogressFaultNumber, setInprogressFaultNumber] = useState({});
  const [doneFaultNumber, setDoneFaultNumber] = useState({});

  // buttons
  const [spinnerHidden, setSpinnerHidden] = useState(true);
  const [exportButtonHidden, setExportButtonHidden] = useState(true);
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);

  useEffect(() => {
    let is_logged_in = getCookieValue('is_logged_in');
    let user_name = getCookieValue('user_name');
    let user_display_name = getCookieValue('user_display_name');
    let user_uuid = getCookieValue('user_uuid');
    let token = getCookieValue('token');
    if (is_logged_in === null || !is_logged_in) {
      setRedirectUrl(`/authentication/basic/login`);
      setRedirect(true);
    } else {
      //update expires time of cookies
      createCookie('is_logged_in', true, settings.cookieExpireTime);
      createCookie('user_name', user_name, settings.cookieExpireTime);
      createCookie('user_display_name', user_display_name, settings.cookieExpireTime);
      createCookie('user_uuid', user_uuid, settings.cookieExpireTime);
      createCookie('token', token, settings.cookieExpireTime);
    }
  });
  // State
  let table = createRef();

  const [isSelected, setIsSelected] = useState(false);
  const handleNextPage = ({ page, onPageChange }) => () => {
    onPageChange(page + 1);
  };

  const handlePrevPage = ({ page, onPageChange }) => () => {
    onPageChange(page - 1);
  };

  const onSelect = () => {
    setImmediate(() => {
      setIsSelected(!!table.current.selectionContext.selected.length);
    });
  };

  // Callback fired when value changed
  let onReportingPeriodChange = DateRange => {
    if (DateRange == null) {
      setReportingPeriodDateRange([null, null]);
    } else {
      if (moment(DateRange[1]).format('HH:mm:ss') === '00:00:00') {
        // if the user did not change time value, set the default time to the end of day
        DateRange[1] = endOfDay(DateRange[1]);
      }
      setReportingPeriodDateRange([DateRange[0], DateRange[1]]);
    }
  };
  // Callback fired when value clean
  let onReportingPeriodClean = event => {
    setReportingPeriodDateRange([null, null]);
  };

  const subjectFormatter = (dataField, { url }) => (
    <Fragment>
      <span>{dataField}</span>
    </Fragment>
  );

  const messageFormatter = dataField => <Fragment>{dataField}</Fragment>;

  const statusFormatter = status => {
    let color = '';
    let icon = '';
    let text = '';
    switch (status) {
      case 'acknowledged':
        color = 'success';
        icon = 'envelope-open';
        text = t('Notification Acknowledged');
        break;
      case 'read':
        color = 'success';
        icon = 'envelope-open';
        text = t('Notification Read');
        break;
      default:
        color = 'primary';
        icon = 'envelope';
        text = t('Notification Unread');
    }

    return (
      <Badge color={`soft-${color}`} className="rounded-capsule fs--1 d-block">
        {text}
        <FontAwesomeIcon icon={icon} transform="shrink-2" className="ml-1" />
      </Badge>
    );
  };

  const actionFormatter = (dataField, { id }) => (
    // Control your row with this id
    <UncontrolledDropdown>
      <DropdownToggle color="link" size="sm" className="text-600 btn-reveal mr-3">
        <FontAwesomeIcon icon="ellipsis-h" className="fs--1" />
      </DropdownToggle>
      <DropdownMenu right className="border py-2">
        <DropdownItem onClick={() => handleRead(id)}>{t('Notification Mark As Read')}</DropdownItem>
        <DropdownItem onClick={() => handleAcknowledged(id)}>{t('Notification Mark As Acknowledged')}</DropdownItem>
        <DropdownItem divider />
        <DropdownItem onClick={() => handledelete(id)} className="text-danger">
          {t('Notification Delete')}
        </DropdownItem>
      </DropdownMenu>
    </UncontrolledDropdown>
  );

  const columns = [
    {
      dataField: 'subject',
      text: t('Notification Subject'),
      classes: 'py-2 align-middle',
      formatter: subjectFormatter,
      sort: true
    },
    {
      dataField: 'message',
      text: t('Notification Message'),
      classes: 'py-2 align-middle',
      formatter: messageFormatter,
      sort: true
    },
    {
      dataField: 'created_datetime',
      text: t('Notification Created Datetime'),
      classes: 'py-2 align-middle',
      sort: true
    },
    {
      dataField: 'start_datetime',
      text: t('Notification Start Datetime'),
      classes: 'py-2 align-middle',
      sort: true
    },
    {
      dataField: 'end_datetime',
      text: t('Notification End Datetime'),
      classes: 'py-2 align-middle',
      sort: true
    },
    {
      dataField: 'status',
      text: t('Notification Status'),
      classes: 'py-2 align-middle',
      formatter: statusFormatter,
      sort: true
    },
    {
      dataField: 'update_datetime',
      text: t('Notification Update Datetime'),
      classes: 'py-2 align-middle',
      sort: true
    },
    {
      dataField: '',
      text: '',
      classes: 'py-2 align-middle',
      formatter: actionFormatter,
      align: 'right'
    }
  ];

  const options = {
    custom: true,
    sizePerPage: 10,
    totalSize: faults.length
  };

  const SelectRowInput = ({ indeterminate, rowIndex, ...rest }) => (
    <div className="custom-control custom-checkbox">
      <input
        className="custom-control-input"
        {...rest}
        onChange={() => {}}
        ref={input => {
          if (input) input.indeterminate = indeterminate;
        }}
      />
      <label className="custom-control-label" />
    </div>
  );

  const selectRow = onSelect => ({
    mode: 'checkbox',
    classes: 'py-2 align-middle',
    clickToSelect: false,
    selectionHeaderRenderer: ({ mode, ...rest }) => <SelectRowInput type="checkbox" {...rest} />,
    selectionRenderer: ({ mode, ...rest }) => <SelectRowInput type={mode} {...rest} />,
    onSelect: onSelect,
    onSelectAll: onSelect
  });
  const labelClasses = 'ls text-uppercase text-600 font-weight-semi-bold mb-0';

  // Handler
  const handleSubmit = e => {
    e.preventDefault();
    // disable submit button
    setSubmitButtonDisabled(true);
    // show spinner
    setSpinnerHidden(false);
    // hide export button
    setExportButtonHidden(true);

    // Reinitialize tables
    setFaults([]);
    let totalFaultNumber = 0;
    let newFaultNumber = 0;
    let inprogressFaultNumber = 0;
    let doneFaultNumber = 0;

    let isResponseOK = false;
    fetch(
      APIBaseURL +
        '/webmessages?' +
        'startdatetime=' +
        moment(reportingPeriodDateRange[0]).format('YYYY-MM-DDTHH:mm:ss') +
        '&enddatetime=' +
        moment(reportingPeriodDateRange[1]).format('YYYY-MM-DDTHH:mm:ss') +
        '&priority=' +
        priority +
        '&status=' +
        status,
      {
        method: 'GET',
        headers: {
          'Content-type': 'application/json',
          'User-UUID': getCookieValue('user_uuid'),
          Token: getCookieValue('token')
        },
        body: null
      }
    )
      .then(response => {
        if (response.ok) {
          isResponseOK = true;
        }
        // enable submit button
        setSubmitButtonDisabled(false);
        // hide spinner
        setSpinnerHidden(true);
        // show export button
        setExportButtonHidden(false);

        return response.json();
      })
      .then(json => {
        if (isResponseOK) {
          let faultList = [];

          if (json.length > 0) {
            json.forEach((currentValue, index) => {
              let fault = {};
              fault['id'] = currentValue['id'];
              fault['subject'] = currentValue['subject'];
              fault['message'] = currentValue['message'];
              fault['created_datetime'] = moment(parseInt(currentValue['created_datetime'])).format(
                'YYYY-MM-DD HH:mm:ss'
              );
              fault['start_datetime'] = moment(parseInt(currentValue['start_datetime'])).format('YYYY-MM-DD HH:mm:ss');
              fault['end_datetime'] = moment(parseInt(currentValue['end_datetime'])).format('YYYY-MM-DD HH:mm:ss');
              fault['status'] = currentValue['status'];
              totalFaultNumber += 1;
              // todo: parse status
              newFaultNumber += 1;

              fault['update_datetime'] = moment(parseInt(currentValue['update_datetime'])).format(
                'YYYY-MM-DD HH:mm:ss'
              );
              fault['url'] = currentValue['url'];

              faultList.push(fault);
            });
          }

          setFaults(faultList);
          setTotalFaultNumber(totalFaultNumber);
          setNewFaultNumber(newFaultNumber);
          setInprogressFaultNumber(inprogressFaultNumber);
          setDoneFaultNumber(doneFaultNumber);
          setExcelBytesBase64(json['excel_bytes_base64']);
          setSpinnerHidden(true);
        } else {
          toast.error(t(json.description));
        }
      })
      .catch(err => {
        console.log(err);
      });
  };

  const handleRead = id => {
    let isResponseOK = false;
    fetch(APIBaseURL + '/webmessages/' + id, {
      method: 'PUT',
      headers: {
        'Content-type': 'application/json',
        'User-UUID': getCookieValue('user_uuid'),
        Token: getCookieValue('token')
      },
      body: JSON.stringify({
        data: {
          status: 'read'
        }
      })
    })
      .then(response => {
        if (response.ok) {
          isResponseOK = true;
          return null;
        } else {
          return response.json();
        }
      })
      .then(json => {
        if (isResponseOK) {
          let isResponseOK = false;
          fetch(
            APIBaseURL +
              '/webmessages?' +
              'startdatetime=' +
              moment(reportingPeriodDateRange[0]).format('YYYY-MM-DDTHH:mm:ss') +
              '&enddatetime=' +
              moment(reportingPeriodDateRange[1]).format('YYYY-MM-DDTHH:mm:ss') +
              '&priority=' +
              priority +
              '&status=' +
              status,
            {
              method: 'GET',
              headers: {
                'Content-type': 'application/json',
                'User-UUID': getCookieValue('user_uuid'),
                Token: getCookieValue('token')
              },
              body: null
            }
          )
            .then(response => {
              if (response.ok) {
                isResponseOK = true;
              }
              return response.json();
            })
            .then(json => {
              if (isResponseOK) {
                let faultList = [];

                if (json.length > 0) {
                  json.forEach((currentValue, index) => {
                    let fault = {};
                    fault['id'] = json[index]['id'];
                    fault['subject'] = json[index]['subject'];
                    fault['message'] = json[index]['message'];
                    fault['created_datetime'] = moment(parseInt(json[index]['created_datetime'])).format(
                      'YYYY-MM-DD HH:mm:ss'
                    );
                    fault['start_datetime'] = moment(parseInt(json[index]['start_datetime'])).format(
                      'YYYY-MM-DD HH:mm:ss'
                    );
                    fault['end_datetime'] = moment(parseInt(json[index]['end_datetime'])).format('YYYY-MM-DD HH:mm:ss');
                    fault['status'] = json[index]['status'];
                    fault['update_datetime'] = moment(parseInt(json[index]['update_datetime'])).format(
                      'YYYY-MM-DD HH:mm:ss'
                    );
                    fault['url'] = json[index]['url'];

                    faultList.push(fault);
                  });
                }

                setFaults(faultList);
                setSpinnerHidden(true);
              }
            });
        } else {
          toast.error(t(json.description));
        }
      })
      .catch(err => {
        console.log(err);
      });
  };

  const handleAcknowledged = id => {
    let isResponseOK = false;
    fetch(APIBaseURL + '/webmessages/' + id, {
      method: 'PUT',
      headers: {
        'Content-type': 'application/json',
        'User-UUID': getCookieValue('user_uuid'),
        Token: getCookieValue('token')
      },
      body: JSON.stringify({
        data: {
          status: 'acknowledged',
          reply: 'OK'
        }
      })
    })
      .then(response => {
        if (response.ok) {
          isResponseOK = true;
          return null;
        } else {
          return response.json();
        }
      })
      .then(json => {
        if (isResponseOK) {
          let isResponseOK = false;
          fetch(
            APIBaseURL +
              '/webmessages?' +
              'startdatetime=' +
              moment(reportingPeriodDateRange[0]).format('YYYY-MM-DDTHH:mm:ss') +
              '&enddatetime=' +
              moment(reportingPeriodDateRange[1]).format('YYYY-MM-DDTHH:mm:ss') +
              '&priority=' +
              priority +
              '&status=' +
              status,
            {
              method: 'GET',
              headers: {
                'Content-type': 'application/json',
                'User-UUID': getCookieValue('user_uuid'),
                Token: getCookieValue('token')
              },
              body: null
            }
          )
            .then(response => {
              if (response.ok) {
                isResponseOK = true;
              }
              return response.json();
            })
            .then(json => {
              if (isResponseOK) {
                let faultList = [];

                if (json.length > 0) {
                  json.forEach((currentValue, index) => {
                    let fault = {};
                    fault['id'] = json[index]['id'];
                    fault['subject'] = json[index]['subject'];
                    fault['message'] = json[index]['message'];
                    fault['created_datetime'] = moment(parseInt(json[index]['created_datetime'])).format(
                      'YYYY-MM-DD HH:mm:ss'
                    );
                    fault['start_datetime'] = moment(parseInt(json[index]['start_datetime'])).format(
                      'YYYY-MM-DD HH:mm:ss'
                    );
                    fault['end_datetime'] = moment(parseInt(json[index]['end_datetime'])).format('YYYY-MM-DD HH:mm:ss');
                    fault['status'] = json[index]['status'];
                    fault['update_datetime'] = moment(parseInt(json[index]['update_datetime'])).format(
                      'YYYY-MM-DD HH:mm:ss'
                    );
                    fault['url'] = json[index]['url'];
                    faultList.push(fault);
                  });
                }

                setFaults(faultList);
                setSpinnerHidden(true);
              }
            });
        } else {
          toast.error(t(json.description));
        }
      })
      .catch(err => {
        console.log(err);
      });
  };

  const handledelete = id => {
    let isResponseOK = false;
    fetch(APIBaseURL + '/webmessages/' + id, {
      method: 'DELETE',
      headers: {
        'Content-type': 'application/json',
        'User-UUID': getCookieValue('user_uuid'),
        Token: getCookieValue('token')
      },
      body: null
    })
      .then(response => {
        if (response.ok) {
          isResponseOK = true;
          return null;
        } else {
          return response.json();
        }
      })
      .then(json => {
        if (isResponseOK) {
          let isResponseOK = false;
          fetch(
            APIBaseURL +
              '/webmessages?' +
              'startdatetime=' +
              moment(reportingPeriodDateRange[0]).format('YYYY-MM-DDTHH:mm:ss') +
              '&enddatetime=' +
              moment(reportingPeriodDateRange[1]).format('YYYY-MM-DDTHH:mm:ss') +
              '&priority=' +
              priority +
              '&status=' +
              status,
            {
              method: 'GET',
              headers: {
                'Content-type': 'application/json',
                'User-UUID': getCookieValue('user_uuid'),
                Token: getCookieValue('token')
              },
              body: null
            }
          )
            .then(response => {
              if (response.ok) {
                isResponseOK = true;
              }
              return response.json();
            })
            .then(json => {
              if (isResponseOK) {
                let faultList = [];

                if (json.length > 0) {
                  json.forEach((currentValue, index) => {
                    let fault = {};
                    fault['id'] = json[index]['id'];
                    fault['subject'] = json[index]['subject'];
                    fault['message'] = json[index]['message'];
                    fault['created_datetime'] = moment(parseInt(json[index]['created_datetime'])).format(
                      'YYYY-MM-DD HH:mm:ss'
                    );
                    fault['start_datetime'] = moment(parseInt(json[index]['start_datetime'])).format(
                      'YYYY-MM-DD HH:mm:ss'
                    );
                    fault['end_datetime'] = moment(parseInt(json[index]['end_datetime'])).format('YYYY-MM-DD HH:mm:ss');
                    fault['status'] = json[index]['status'];
                    fault['update_datetime'] = moment(parseInt(json[index]['update_datetime'])).format(
                      'YYYY-MM-DD HH:mm:ss'
                    );
                    fault['url'] = json[index]['url'];

                    faultList.push(fault);
                  });
                }

                setFaults(faultList);
                setSpinnerHidden(true);
              }
            });
        } else {
          toast.error(t(json.description));
        }
      })
      .catch(err => {
        console.log(err);
      });
  };

  const handleExport = e => {
    e.preventDefault();
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const fileName = 'fddfault.xlsx';
    var fileUrl = 'data:' + mimeType + ';base64,' + excelBytesBase64;
    fetch(fileUrl)
      .then(response => response.blob())
      .then(blob => {
        var link = window.document.createElement('a');
        link.href = window.URL.createObjectURL(blob, { type: mimeType });
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
  };

  return (
    <Fragment>
      <div>
        <Breadcrumb>
          <BreadcrumbItem active>{t('Work Order Repair')}</BreadcrumbItem>
        </Breadcrumb>
      </div>
      <Card className="bg-light mb-3">
        <CardBody className="p-3">
          <Form onSubmit={handleSubmit}>
            <Row form>
              <Col sm={1}>
                <FormGroup className="form-group">
                  <Label className={labelClasses} for="priority">
                    {t('Notification Priority')}
                  </Label>
                  <CustomInput
                    type="select"
                    id="bulk-select"
                    bsSize="sm"
                    value={priority}
                    onChange={({ target }) => {
                      setPriority(target.value);
                    }}
                  >
                    <option value="all" key="all">
                      {t('View all')}
                    </option>
                    <option value="LOW" key="low">
                      {t('Notification Low')}
                    </option>
                    <option value="MEDIUM" key="medium">
                      {t('Notification Medium')}
                    </option>
                    <option value="HIGH" key="high">
                      {t('Notification High')}
                    </option>
                    <option value="CRITICAL" key="critical">
                      {t('Notification Critical')}
                    </option>
                  </CustomInput>
                </FormGroup>
              </Col>
              <Col sm={1}>
                <FormGroup className="form-group">
                  <Label className={labelClasses} for="status">
                    {t('Notification Status')}
                  </Label>
                  <CustomInput
                    type="select"
                    id="bulk-select"
                    bsSize="sm"
                    value={status}
                    onChange={({ target }) => {
                      setStatus(target.value);
                    }}
                  >
                    <option value="all" key="all">
                      {t('View all')}
                    </option>
                    <option value="read" key="read">
                      {t('Notification Read')}
                    </option>
                    <option value="new" key="unread">
                      {t('Notification New')}
                    </option>
                    <option value="acknowledged" key="acknowledged">
                      {t('Notification Acknowledged')}
                    </option>
                  </CustomInput>
                </FormGroup>
              </Col>
              <Col xs={6} sm={3}>
                <FormGroup className="form-group">
                  <Label className={labelClasses} for="reportingPeriodDateRangePicker">
                    {t('Reporting Period')}
                  </Label>
                  <br />
                  <DateRangePickerWrapper
                    id="reportingPeriodDateRangePicker"
                    format="yyyy-MM-dd HH:mm:ss"
                    value={reportingPeriodDateRange}
                    onChange={onReportingPeriodChange}
                    size="sm"
                    style={dateRangePickerStyle}
                    onClean={onReportingPeriodClean}
                    locale={dateRangePickerLocale}
                    placeholder={t('Select Date Range')}
                  />
                </FormGroup>
              </Col>
              <Col xs="auto">
                <FormGroup>
                  <br />
                  <Spinner color="primary" hidden={spinnerHidden} />
                </FormGroup>
              </Col>
              <Col xs="auto">
                <FormGroup>
                  <br />
                  <ButtonGroup id="submit">
                    <Button size="sm" color="success" disabled={submitButtonDisabled}>
                      {t('Submit')}
                    </Button>
                  </ButtonGroup>
                </FormGroup>
              </Col>
              <Col xs="auto">
                <br />
                <ButtonIcon
                  icon="external-link-alt"
                  transform="shrink-3 down-2"
                  color="falcon-default"
                  size="sm"
                  hidden={exportButtonHidden}
                  onClick={handleExport}
                >
                  {t('Export')}
                </ButtonIcon>
              </Col>
            </Row>
          </Form>
        </CardBody>
      </Card>
      <div className="card-deck">
        <CardSummary rate={''} title={t('Total Number of Work Orders')} footunit={''} color="info">
          {1 && <CountUp end={totalFaultNumber} duration={2} prefix="" separator="," decimal="." decimals={0} />}
        </CardSummary>
        <CardSummary rate={''} title={t('Number of New Work Orders')} footunit={''} color="info">
          {1 && <CountUp end={newFaultNumber} duration={2} prefix="" separator="," decimal="." decimals={0} />}
        </CardSummary>
        <CardSummary rate={''} title={t('Number of Inprogress Work Orders')} footunit={''} color="info">
          {1 && <CountUp end={inprogressFaultNumber} duration={2} prefix="" separator="," decimal="." decimals={0} />}
        </CardSummary>
        <CardSummary rate={''} title={t('Number of Done Work Orders')} footunit={''} color="info">
          {1 && <CountUp end={doneFaultNumber} duration={2} prefix="" separator="," decimal="." decimals={0} />}
        </CardSummary>
      </div>
      <Card className="mb-3">
        <FalconCardHeader title={t('Work Order Repair')} light={false} titleClass="text-lightSlateGray mb-0">
          {isSelected ? (
            <InputGroup size="sm" className="input-group input-group-sm">
              <CustomInput type="select" id="bulk-select" bsSize="sm">
                <option>{t('Bulk actions')}</option>
                <option value="MarkAsRead">{t('Notification Mark As Read')}</option>
                <option value="MarkAsAcknowledged">{t('Notification Mark As Acknowledged')}</option>
                <option value="Delete">{t('Notification Delete')}</option>
              </CustomInput>
              <Button color="falcon-default" size="sm" className="ml-2">
                {t('Notification Apply')}
              </Button>
            </InputGroup>
          ) : (
            <Fragment />
          )}
        </FalconCardHeader>
        <CardBody className="p-0">
          <PaginationProvider pagination={paginationFactory(options)}>
            {({ paginationProps, paginationTableProps }) => {
              const lastIndex = paginationProps.page * paginationProps.sizePerPage;

              return (
                <Fragment>
                  <div className="table-responsive">
                    <BootstrapTable
                      ref={table}
                      bootstrap4
                      keyField="id"
                      data={faults}
                      columns={columns}
                      selectRow={selectRow(onSelect)}
                      bordered={false}
                      classes="table-dashboard table-striped table-sm fs--1 border-bottom mb-0 table-dashboard-th-nowrap"
                      rowClasses="btn-reveal-trigger"
                      headerClasses="bg-200 text-900"
                      {...paginationTableProps}
                    />
                  </div>
                  <Row noGutters className="px-1 py-3 flex-center">
                    <Col xs="auto">
                      <Button
                        color="falcon-default"
                        size="sm"
                        onClick={handlePrevPage(paginationProps)}
                        disabled={paginationProps.page === 1}
                      >
                        <FontAwesomeIcon icon="chevron-left" />
                      </Button>
                      {getPaginationArray(paginationProps.totalSize, paginationProps.sizePerPage).map(pageNo => (
                        <Button
                          color={paginationProps.page === pageNo ? 'falcon-primary' : 'falcon-default'}
                          size="sm"
                          className="ml-2"
                          onClick={() => paginationProps.onPageChange(pageNo)}
                          key={pageNo}
                        >
                          {pageNo}
                        </Button>
                      ))}
                      <Button
                        color="falcon-default"
                        size="sm"
                        className="ml-2"
                        onClick={handleNextPage(paginationProps)}
                        disabled={lastIndex >= paginationProps.totalSize}
                      >
                        <FontAwesomeIcon icon="chevron-right" />
                      </Button>
                    </Col>
                  </Row>
                </Fragment>
              );
            }}
          </PaginationProvider>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default withTranslation()(withRedirect(WorkOrderRepair));
