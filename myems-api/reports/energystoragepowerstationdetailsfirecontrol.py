from datetime import datetime, timedelta
import falcon
import mysql.connector
import simplejson as json
from core.useractivity import access_control, api_key_control
import config


class Reporting:
    def __init__(self):
        """Initializes Class"""
        pass

    @staticmethod
    def on_options(req, resp, id_):
        resp.status = falcon.HTTP_200

    ####################################################################################################################
    # PROCEDURES
    # Step 1: valid parameters
    # Step 2: query the energy storage power station
    # Step 3: query associated containers
    # Step 4: query analog points latest values
    # Step 5: query energy points latest values
    # Step 6: query digital points latest values
    # Step 7: query the points of firecontrols
    # Step 8: construct the report
    ####################################################################################################################
    @staticmethod
    def on_get(req, resp, id_):
        if 'API-KEY' not in req.headers or \
                not isinstance(req.headers['API-KEY'], str) or \
                len(str.strip(req.headers['API-KEY'])) == 0:
            access_control(req)
        else:
            api_key_control(req)

        ################################################################################################################
        # Step 1: valid parameters
        ################################################################################################################
        if not id_.isdigit() or int(id_) <= 0:
            raise falcon.HTTPError(status=falcon.HTTP_400, title='API.BAD_REQUEST',
                                   description='API.INVALID_ENERGY_STORAGE_POWER_STATION_ID')
        energy_storage_power_station_id = id_
        ################################################################################################################
        # Step 2: query the energy storage power station
        ################################################################################################################
        cnx_system = mysql.connector.connect(**config.myems_system_db)
        cursor_system = cnx_system.cursor()

        cnx_historical = mysql.connector.connect(**config.myems_historical_db)
        cursor_historical = cnx_historical.cursor()

        if energy_storage_power_station_id is not None:
            query = (" SELECT id, name, uuid "
                     " FROM tbl_energy_storage_power_stations "
                     " WHERE id = %s ")
            cursor_system.execute(query, (energy_storage_power_station_id,))
            row = cursor_system.fetchone()

        if row is None:
            cursor_system.close()
            cnx_system.close()
            raise falcon.HTTPError(status=falcon.HTTP_404, title='API.NOT_FOUND',
                                   description='API.ENERGY_STORAGE_POWER_STATION_NOT_FOUND')
        else:
            energy_storage_power_station_id = row[0]
            meta_result = {"id": row[0],
                           "name": row[1],
                           "uuid": row[2]}

        ################################################################################################################
        # Step 3: query associated containers
        ################################################################################################################
        container_list = list()
        cursor_system.execute(" SELECT c.id, c.name, c.uuid "
                              " FROM tbl_energy_storage_power_stations_containers espsc, "
                              "      tbl_energy_storage_containers c "
                              " WHERE espsc.energy_storage_power_station_id = %s "
                              "      AND espsc.energy_storage_container_id = c.id ",
                              (energy_storage_power_station_id,))
        rows_containers = cursor_system.fetchall()
        if rows_containers is not None and len(rows_containers) > 0:
            for row_container in rows_containers:
                container_list.append({"id": row_container[0],
                                       "name": row_container[1],
                                       "uuid": row_container[2]})
        print('container_list:' + str(container_list))

        ################################################################################################################
        # Step 4: query analog points latest values
        ################################################################################################################
        latest_value_dict = dict()
        query = (" SELECT point_id, actual_value "
                 " FROM tbl_analog_value_latest "
                 " WHERE utc_date_time > %s ")
        cursor_historical.execute(query, (datetime.utcnow() - timedelta(minutes=60),))
        rows = cursor_historical.fetchall()
        if rows is not None and len(rows) > 0:
            for row in rows:
                latest_value_dict[row[0]] = row[1]

        ################################################################################################################
        # Step 5: query energy points latest values
        ################################################################################################################
        query = (" SELECT point_id, actual_value "
                 " FROM tbl_energy_value_latest "
                 " WHERE utc_date_time > %s ")
        cursor_historical.execute(query, (datetime.utcnow() - timedelta(minutes=60),))
        rows = cursor_historical.fetchall()
        if rows is not None and len(rows) > 0:
            for row in rows:
                latest_value_dict[row[0]] = row[1]

        ################################################################################################################
        # Step 6: query digital points latest values
        ################################################################################################################
        query = (" SELECT point_id, actual_value "
                 " FROM tbl_digital_value_latest "
                 " WHERE utc_date_time > %s ")
        cursor_historical.execute(query, (datetime.utcnow() - timedelta(minutes=60),))
        rows = cursor_historical.fetchall()
        if rows is not None and len(rows) > 0:
            for row in rows:
                latest_value_dict[row[0]] = row[1]

        ################################################################################################################
        # Step 7: query the points of firecontrols
        ################################################################################################################
        # query all points with units
        query = (" SELECT id, units "
                 " FROM tbl_points ")
        cursor_system.execute(query)
        rows = cursor_system.fetchall()

        units_dict = dict()
        if rows is not None and len(rows) > 0:
            for row in rows:
                units_dict[row[0]] = row[1]
        # query firecontrol parameters
        firecontrol_list = list()
        for container in container_list:
            cursor_system.execute(" SELECT id, name, uuid, "
                                  "        water_immersion_point_id, "
                                  "        emergency_stop_point_id, "
                                  "        electrical_compartment_smoke_detector_point_id, "
                                  "        battery_compartment_door_open_point_id, "
                                  "        electrical_compartment_door_open_point_id, "
                                  "        first_level_fire_alarm_point_id, "
                                  "        second_level_fire_alarm_point_id, "
                                  "        running_light_point_id, "
                                  "        fault_light_point_id, "
                                  "        ac_relay_tripping_point_id, "
                                  "        inside_temperature_point_id, "
                                  "        outside_temperature_point_id, "
                                  "        temperature_alarm_point_id, "
                                  "        smoke_sensor_value_point_id, "
                                  "        smoke_sensor_alarm_point_id, "
                                  "        battery_safety_detection_sensor_value_point_id, "
                                  "        battery_safety_detection_sensor_alarm_point_id, "
                                  "        fire_extinguishing_device_status_point_id "
                                  " FROM tbl_energy_storage_containers_firecontrols "
                                  " WHERE energy_storage_container_id = %s "
                                  " ORDER BY id ",
                                  (container['id'],))
            rows_firecontrols = cursor_system.fetchall()
            if rows_firecontrols is not None and len(rows_firecontrols) > 0:
                for row in rows_firecontrols:
                    current_firecontrol = dict()
                    current_firecontrol['id'] = row[0]
                    current_firecontrol['name'] = container['name'] + '-' + row[1]
                    current_firecontrol['uuid'] = row[2]
                    current_firecontrol['water_immersion_point'] = \
                        (latest_value_dict.get(row[3], None),
                         units_dict.get(row[3], None))
                    current_firecontrol['emergency_stop_point'] = \
                        (latest_value_dict.get(row[4], None),
                         units_dict.get(row[4], None))
                    current_firecontrol['electrical_compartment_smoke_detector_point'] = \
                        (latest_value_dict.get(row[5], None),
                         units_dict.get(row[5], None))
                    current_firecontrol['battery_compartment_door_open_point'] = \
                        (latest_value_dict.get(row[6], None),
                         units_dict.get(row[6], None))
                    current_firecontrol['electrical_compartment_door_open_point'] = \
                        (latest_value_dict.get(row[7], None),
                         units_dict.get(row[7], None))
                    current_firecontrol['first_level_fire_alarm_point'] = \
                        (latest_value_dict.get(row[8], None),
                         units_dict.get(row[8], None))
                    current_firecontrol['second_level_fire_alarm_point'] = \
                        (latest_value_dict.get(row[9], None),
                         units_dict.get(row[9], None))
                    current_firecontrol['running_light_point'] = \
                        (latest_value_dict.get(row[10], None),
                         units_dict.get(row[10], None))
                    current_firecontrol['fault_light_point'] = \
                        (latest_value_dict.get(row[11], None),
                         units_dict.get(row[11], None))
                    current_firecontrol['ac_relay_tripping_point'] = \
                        (latest_value_dict.get(row[12], None),
                         units_dict.get(row[12], None))
                    current_firecontrol['inside_temperature_point'] = \
                        (latest_value_dict.get(row[13], None),
                         units_dict.get(row[13], None))
                    current_firecontrol['outside_temperature_point'] = \
                        (latest_value_dict.get(row[14], None),
                         units_dict.get(row[14], None))
                    current_firecontrol['temperature_alarm_point'] = \
                        (latest_value_dict.get(row[15], None),
                         units_dict.get(row[15], None))
                    current_firecontrol['smoke_sensor_value_point'] = \
                        (latest_value_dict.get(row[16], None),
                         units_dict.get(row[16], None))
                    current_firecontrol['smoke_sensor_alarm_point'] = \
                        (latest_value_dict.get(row[17], None),
                         units_dict.get(row[17], None))
                    current_firecontrol['battery_safety_detection_sensor_value_point'] = \
                        (latest_value_dict.get(row[18], None),
                         units_dict.get(row[18], None))
                    current_firecontrol['battery_safety_detection_sensor_alarm_point'] = \
                        (latest_value_dict.get(row[19], None),
                         units_dict.get(row[19], None))
                    current_firecontrol['fire_extinguishing_device_status_point'] = \
                        (latest_value_dict.get(row[20], None),
                         units_dict.get(row[20], None))
                    firecontrol_list.append(current_firecontrol)

        if cursor_system:
            cursor_system.close()
        if cnx_system:
            cnx_system.close()

        if cursor_historical:
            cursor_historical.close()
        if cnx_historical:
            cnx_historical.close()
        ################################################################################################################
        # Step 8: construct the report
        ################################################################################################################
        resp.text = json.dumps(firecontrol_list)
