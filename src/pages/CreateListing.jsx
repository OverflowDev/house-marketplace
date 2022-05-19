import {useState, useEffect, useRef} from 'react'
import {getAuth, onAuthStateChanged} from 'firebase/auth'
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
} from 'firebase/storage'
import {addDoc, collection, serverTimestamp} from 'firebase/firestore'
import {db} from '../firebase.config'
import {useNavigate} from 'react-router-dom'
import Spinner from '../components/Spinner'
import {toast} from 'react-toastify'
import {v4 as uuidv4} from 'uuid'


function CreateListing() {

    const [geolocationEnabled, setGeolocationEnabled] = useState(false)
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        type: 'rent', 
        name: '',
        bedrooms: 1,
        bathrooms: 1,
        parking: false,
        furnished: false,
        address: '',
        offer: false,
        regularPrice: 0, 
        discountedPrice: 0,
        images: {},
        latitude: 0,
        longitude: 0,
    })

    const {
        type, 
        name,
        bedrooms,
        bathrooms,
        parking,
        furnished,
        address,
        offer,
        regularPrice, 
        discountedPrice,
        images,
        latitude,
        longitude
    } = formData

    const auth = getAuth()
    const navigate = useNavigate()
    const isMounted = useRef(true)

    useEffect(() => {
        if(isMounted) {
            onAuthStateChanged(auth, (user) => {
                if(user) {
                    setFormData({...formData, userRef: user.uid})
                } else {
                    navigate('/sign-in')
                }
            })
        }

        return () => {
            isMounted.current = false
        }
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMounted])

    const onSubmit = async (e) => {
        e.preventDefault()

        setLoading(true)

        if(discountedPrice >= regularPrice){
            setLoading(false)
            toast.error('Discounted price needs to be less than regular price')
            return
        }

        if(images.length > 6) {
            setLoading(false)
            toast.error('Max 6 images')
            return

        }

        let geolocation = {}
        let location

        if(geolocationEnabled) {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?
                address=${address}&
                key=${process.env.REACT_APP_GEOCODE_API_KEY}`
            )
            const data = await response.json()
            
            // console.log(data)
            geolocation.lat = data.results[0]?.geometry.location.lat ?? 0
            geolocation.lng = data.results[0]?.geometry.location.lng ?? 0

            location = data.status === 'ZERO_RESULTS' 
                ? undefined 
                : data.results[0]?.formatted_address

                if(location === undefined || location.icludes('undefined')){
                    setLoading(false)
                    toast.error('Please enter a correct address')
                    return
                }

        } else {
            geolocation.lat = latitude
            geolocation.lng = longitude
            location = address

        }

        // Store images in firebase
        const storeImage = async (image) => {
            return new Promise((resolve, reject) => {
                const storage = getStorage()
                const filename = `${auth.currentUser.uid}-${image.name}-${uuidv4()}`

                const storageRef = ref(storage, 'images/' + filename)

                const uploadTask = uploadBytesResumable(storageRef, image)

                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                        console.log('Upload is ' + progress + '% done')
                        switch (snapshot.state) {
                            case 'paused':
                                console.log('Upload is paused')
                                break
                            case 'running':
                                console.log('Upload is running')
                                break
                            default:
                                break
                        }
                    },
                    (error) => {
                        // unsuccessful upload 
                        reject(error)
                    }, 
                    // handle success 
                    () => {
                        getDownloadURL(uploadTask.snapshot.ref).then(
                            (downloadURL) => {
                                resolve(downloadURL)
                            })
                    }
                
                )

            })
        }



        const imageUrls = await Promise.all(
            [...images].map((image) => storeImage(image))
        ).catch(() => {
            setLoading(false)
            toast.error('Images not uploaded')
            return
        })

        console.log(imageUrls)

        const formDataCopy = {
            ...formData,
            imageUrls, 
            geolocation,
            timestamp: serverTimestamp()
        }

        formDataCopy.location = address
        delete formDataCopy.images
        delete formDataCopy.address
        // location && (formDataCopy.location = location)
        !formDataCopy.offer && delete formDataCopy.discountedPrice

        const docRef = await addDoc(collection(db, 'listings'), formDataCopy)

        setLoading(false)

        toast.success('Listing saved')
        navigate(`/category/${formDataCopy.type}/${docRef.id}`)
    }
    // On Mutate 
    const onMutate = (e) => {
        // Boolean 
        let boolean = null

        if(e.target.value === 'true') {
            boolean = true
        }
        if(e.target.value === 'false') {
            boolean = false
        }

        // File 
        if(e.target.files) {
            setFormData((prevState) => ({
                ...prevState,
                images: e.target.files
            }))
        }

        // Text/Booleans/Number
        if(!e.target.files) {
            setFormData((prevState) => ({
                ...prevState,
                // ?? means if the value  on left is null then use this value on the left
                [e.target.id]: boolean ?? e.target.value
            }))
        }
    }

    // Loading 
    if(loading) {
        <Spinner />
    }

    return (
        <div className='profile'>
            <header>
                <p className="pageHeader">Create a Listing</p>
            </header>

            <main>
                <form onSubmit={onSubmit}>
                    {/* Sell or rent  */}
                    <label htmlFor="" className='formLabel'>Sell / Rent</label>
                    <div className="formButton">
                        <button 
                            type='button' 
                            className={
                                type === 'sale' 
                                ? 'formButtonActive' 
                                : 'formButton'}
                            id='type'
                            value='sale'
                            onClick={onMutate}
                        >
                            Sell
                        </button>
                        <button 
                            type='button' 
                            className={
                                type === 'rent' 
                                ? 'formButtonActive' 
                                : 'formButton'}
                                id='type'
                                value='rent'
                                onClick={onMutate}
                                >
                            Rent
                        </button>
                    </div>
                    {/* Sell or rent end  */}
                    
                    {/* Name  */}
                    <label htmlFor="" className='formLabel'>Name</label>
                    <input
                        className='formInputName' 
                        type="text" 
                        id='name'
                        value={name}
                        onChange={onMutate}
                        maxLength='32'
                        minLength='10'
                        required
                    />
                    {/* Name end  */}

                    {/* Bedrooms and Bathrooms  */}
                    <div className="formRooms flex">
                        <div>
                            <label htmlFor="" className='formLabel'>Bedrooms</label>
                            <input
                                className='formInputSmall' 
                                type="number" 
                                id='bedrooms'
                                value={bedrooms}
                                onChange={onMutate}
                                maxLength='1'
                                minLength='50'
                                required
                                />
                        </div>
                        <div>
                            <label htmlFor="" className='formLabel'>Bathrooms</label>
                            <input
                                className='formInputSmall' 
                                type="number" 
                                id='bathrooms'
                                value={bathrooms}
                                onChange={onMutate}
                                maxLength='1'
                                minLength='50'
                                required
                                />
                        </div>
                    </div>
                    {/* Bedrooms and Bathrooms end  */}

                    {/* Parking Spot  */}
                    <label htmlFor="" className='formLabel'>Parking</label>
                    <div className="formButtons">
                        <button
                            className={parking ? 'formButtonActive' : 'formButton'} 
                            type="button" 
                            id='parking'
                            value={true}
                            onClick={onMutate}
                            maxLength='1'
                            minLength='50'
                        >
                            Yes
                        </button>
                        <button
                            className={!parking && parking !== null ? 'formButtonActive' : 'formButton'} 
                            type="button" 
                            id='parking'
                            value={false}
                            onClick={onMutate}
                        >
                            No
                        </button>
                    </div>

                    {/* Parking Spot Ends  */}

                    {/* Finished Spot  */}
                    <label htmlFor="" className='formLabel'>Furnished</label>
                    <div className="formButtons">
                        <button
                            className={furnished ? 'formButtonActive' : 'formButton'} 
                            type="button" 
                            id='furnished'
                            value={true}
                            onClick={onMutate}
                        >
                            Yes
                        </button>
                        <button
                            className={!furnished && furnished !== null ? 'formButtonActive' : 'formButton'} 
                            type="button" 
                            id='furnished'
                            value={false}
                            onClick={onMutate}
                        >
                            No
                        </button>
                    </div>
                    {/* Furnished Spot end  */}

                    {/* Address  */}
                    <label htmlFor="address" className='formLabel'>Address</label>
                    <textarea 
                        className='formInputAddress'
                        type="text" 
                        id="address" 
                        value={address}
                        onChange={onMutate}
                        required
                    />
                    {!geolocationEnabled && (
                        <div className="formLatLng flex">
                            <div>
                                <label htmlFor="" className='formLabel'>Latitude</label>
                                <input 
                                    className='formInputSmall' 
                                    type="number"
                                    id="latitude" 
                                    value={latitude}
                                    onChange={onMutate}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="" className='formLabel'>Longitude</label>
                                <input 
                                    className='formInputSmall' 
                                    type="number"
                                    id="longitude" 
                                    value={longitude}
                                    onChange={onMutate}
                                    required
                                />
                            </div>
                        </div>
                    )}
                    {/* Address end */}

                    {/* Offer Spot  */}
                    <label htmlFor="" className='formLabel'>Offer</label>
                    <div className="formButtons">
                        <button
                            className={offer ? 'formButtonActive' : 'formButton'} 
                            type="button" 
                            id='offer'
                            value={true}
                            onClick={onMutate}
                        >
                            Yes
                        </button>
                        <button
                            className={!offer && offer !== null ? 'formButtonActive' : 'formButton'} 
                            type="button" 
                            id='offer'
                            value={false}
                            onClick={onMutate}
                        >
                            No
                        </button>
                    </div>
                    {/* Offer Spot end  */}

                    {/* Regular Price  */}
                    <label htmlFor="" className='formLabel'>Regular Price</label>
                    <div className="formPriceDiv">
                        <input
                            className='formInputSmall' 
                            type="number" 
                            id='regularPrice'
                            value={regularPrice}
                            onChange={onMutate}
                            maxLength='50'
                            minLength='750000000'
                            required
                        />
                        {type === 'rent' && (
                            <p className='formPriceText'>$ / Month</p>
                        )}
                    </div>
                    {/* Regular Price Ends  */}

                    {/* Discounted Price  */}
                    {offer && (
                        <>
                            <label htmlFor="" className='formLabel'>Discounted Price</label>
                            <input
                                className='formInputSmall' 
                                type="number" 
                                id='discountedPrice'
                                value={discountedPrice}
                                onChange={onMutate}
                                maxLength='50'
                                minLength='750000000'
                                required = {offer}
                            />
                        </>
                    )}
                    {/* Discounted Price Ends  */}

                    {/* Image upload */}
                    <label htmlFor="" className='formLabel'>Image</label>
                    <p className="imagesInfo">The first image will be the cover (max 6).</p>
                    <input
                        className='formInputFile' 
                        type="file" 
                        id='images'
                        onChange={onMutate}
                        max='6'
                        accept='.jpg, .png, .jpeg'
                        multiple
                        required
                    />
                    {/* Image upload ends */}
                    
                    <button
                        className='primaryButton createListingButton'
                        type='submit'
                    >
                        Create Listing
                    </button>
                </form>
            </main>
        </div>
    )
}

export default CreateListing