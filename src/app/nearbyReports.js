import { useEffect, useState } from "react";
import { supabase } from "../../supabaseConfig";
import { FlatList, View, Text } from "react-native";
import * as ExpoLocation from 'expo-location'

export default function NearbyReports() {
    const [reports, setReports] = useState([])

    useEffect(() => {
        locateMe()
    }, [])

    const locateMe = async () => {
        try {
          let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
                if (Platform.OS === 'web')
            alert("Location permission denied.")
          else
          Alert.alert("Location permission denied.")
            return;
          }
          let currentLoc = await ExpoLocation.getCurrentPositionAsync({});
          fetchNearbyReports(currentLoc.coords)
        
        } catch (error) {
          if (Platform.OS === 'web')
            alert("Error in location detection.")
          else
          Alert.alert("Error in location detection.")
        // TODO(Improve alert)
        }
      };

    function fetchNearbyReports(location) {
        try {
            //const { data: reportsData, error: reportsError } = await 
            supabase.rpc('get_reports_nearby', {
                user_lng: location.longitude,
                user_lat: location.latitude,
                radius_meters: 5000
            }).then((data) => {
                console.log(data)
                setReports(data.data)
            })

            if (reportsError) {
                return;
                // TODO(Add error handling)
            }

            console.log(reportsData)
        } catch (error) {}
    }

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <View>
                    <Text style={{ fontSize: 15 }}>{item.id}</Text>
                </View>
            )}
            />
        </View>
    )
}