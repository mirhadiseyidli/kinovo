import {useAuthSession} from "@/components/Auth/AuthProvider";
import {useState} from "react";
import {View, Text, Button} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

const GOOGLE_MAPS_API_KEY = 'AIzaSyAyngGus6vQzuZsFIo_4kf78nlQ3XAnKQ8';

export default function Index() {
  const {signOut, accessToken, refreshToken} = useAuthSession()
  const [tokenInUi, setTokenInUi] = useState<null|string|undefined>(null)
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate instanceof Date) {
      setEndDate(selectedDate);
    }
  };

  const logout = () => {
     signOut();
  }

  const callApi = () => {
    setTokenInUi(accessToken?.current);
  }

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const onChange = (event: any, selectedDate: Date | undefined) => {
    if (selectedDate instanceof Date) {
      setEndDate(selectedDate);
    }
  };

  const showMode = (currentMode: any) => {
    setShowDatePicker(true);
  };

  const showDatepicker = () => {
    showMode('date');
  };

  const showTimepicker = () => {
    showMode('time');
  };

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        backgroundColor: 'red'
      }}
    >
      <Text>Home</Text>
      <Button title={"Logout"} onPress={logout}/>
      <View style={{
        paddingTop: 20
      }} />
      <Text>Make an API call with the stored AUTH token</Text>
      <Button title={"Call API"} onPress={callApi} />
      {tokenInUi &&
        <Text>{`Your API access token is ${tokenInUi}`}</Text>
      }
      <Button onPress={showDatepicker} title="Show date picker!" />
      <Button onPress={showTimepicker} title="Show time picker!" />
      <Text>selected: {endDate.toLocaleString()}</Text>
      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={endDate}
          mode='date'
          is24Hour={true}
          onChange={onChange}
        />
      )}
      {/* <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'black',
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 8,
          height: 100,
          flexGrow: 1
        }}
      > */}
    </View>
  );
}