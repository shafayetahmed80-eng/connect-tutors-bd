# Tutor Location Selector Reference Notes

## User-provided visual references

The first supplied screenshot, [primary city selector](https://prnt.sc/30dpXH9cfyTO), shows a compact searchable list above the city options. The visible options are Bangladesh locations such as Barishal, Chattogram, Cumilla, Dhaka, Gazipur, Khulna, Mymensingh, Narayanganj, and Rajshahi.

The second supplied screenshot, [area selector](https://prnt.sc/pCV5Jfqi5mJJ), shows that selecting a city reveals a separate searchable list of relevant localities. The example for Dhaka shows entries such as Abdullapur, Adabor, Aftabnagar, Agargaon, Airport Area, Arambagh, Armanitola, Asad Gate, and Ashkona.

## Public Caretutors cues used only as design inspiration

The public [Caretutors homepage](https://caretutors.com/) exposes a “Become a Tutor” entry point and displays city chips such as Dhaka, Rangpur, Narayanganj, Chattogram, Gazipur, Mymensingh, Cumilla, Savar, Khulna, Rajshahi, Barishal, and Sylhet. Its public tutor journey outlines a staged process: complete profile, apply smartly, and get hired.

On the public [Caretutors Tutor signup page](https://caretutors.com/signup/tutor), the City field opens a searchable combobox. The visible suggestions include Barishal, Chattogram, Cumilla, Dhaka, Gazipur, Khulna, Mymensingh, Narayanganj, Rajshahi, Rangpur, Savar, and Sylhet. The subsequent Location field is separate, supporting the user’s requested two-stage City then Location interaction.

After choosing Dhaka on the same public form, the separate Location combobox exposes a search field and a long, scrollable list of localities. Visible entries include Abdullahpur, Adabor, Aftabnagar, Agargaon, Airport Area, Arambagh, Armanitola, Asad Gate, Ashkona, Azampur Kachabazar, Azimpur, Badda, Baily Road, Bakshi Bazar, Banani, Banani DOHS, Banasree, Bangla Motor, Bangshal, Baridhara, Baridhara DOHS, Bashabo, Bashundhara R/A, Bashundhara Riverview, Baunia, Begun Bari, Bijoy Sarani, Bijoynagar, Bosila, BUET Area, Central Road, Chandrima Model Town, Chawk Bazar, College Gate, Darussalam, Daskhin Khan, Demra, Dhaka Cantonment, Dhaka Uddan Housing, Dhaka University Area, Dhanmondi, Dholaikhal, Dholaipar, Diabari, Dilkusha, Dilu Road, Doyagonj, Eastern Housing, ECB Chattar, Elephant Road, and English Road. This confirms that search and scrolling are essential for dense city-area lists.

## Implementation decision

Tutor registration will be Bangladesh-only. Its searchable primary-city choices will contain the eight divisional cities plus Tangail and Sirajগঞ্জ. After choosing a city, a separate searchable area/location selector will show only locations related to that city. International locations remain available for public tutor discovery where already supported, but will not be selectable in this registration flow.
