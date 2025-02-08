window.onload = function ()
{
    setTanggal();
    hideRecheck();
    validateForm();
    console.log("jalan");
};
//event Listener
document.getElementById('id').addEventListener('input',validateForm);
document.getElementById('nama').addEventListener('input',validateForm);
document.getElementById('departemen').addEventListener('input',validateForm);
document.getElementById('lokasi').addEventListener('input',validateForm);
document.querySelectorAll('input[name="presensi"]').forEach((radio) =>
{
    radio.addEventListener('change',validateForm);
});

// Set tanggal otomatis
function setTanggal()
{
    const now = new Date();
    document.getElementById('tanggal').value = now.toISOString().split('T')[0];
}

// Mengambil IP Address
async function getIPAddress()
{
    try
    {
        let response = await fetch('https://api.ipify.org?format=json');
        let data = await response.json();
        return data.ip;
    } catch (error)
    {
        console.error("Gagal mendapatkan IP:",error);
        return "Unknown";
    }
}

// Mengambil UUID, jika tidak ada maka buat yang baru
function getUUID()
{
    let storedUUID = localStorage.getItem('deviceUUID');
    if (!storedUUID)
    {
        storedUUID = crypto.randomUUID();
        localStorage.setItem('deviceUUID',storedUUID);
    }
    return storedUUID;
}

// Mengambil fingerprint
async function getFingerprint()
{
    try
    {
        const fpPromise = FingerprintJS.load();
        const fp = await fpPromise;
        const result = await fp.get();
        return result.visitorId;
    } catch (error)
    {
        console.error("Gagal mendapatkan fingerprint:",error);
        return "Unknown";
    }
}

// Mengambil data user dari Google Apps Script
async function fetchUserData(id)
{
    try
    {
        let response = await fetch(`https://script.google.com/macros/s/AKfycbxKKz4xh7AfSEJUUPsfd8gFhkNyfdzDArDf_gpKvpvgzJpeT7z8ozdQMZ6vZRNskkaekA/exec?getUser=${id}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        let data = await response.json();
        return data.exists ? { nama: data.nama,departemen: data.departemen } : null;
    } catch (error)
    {
        console.error("Gagal mengambil data pengguna:",error);
        return null;
    }
}

// Event handler untuk tombol "Check"
document.getElementById('checkButton').addEventListener('click',async function ()
{
    let userId = document.getElementById('id').value.trim();
    if (!userId)
    {
        alert("Masukkan ID terlebih dahulu!");
        return;
    }
    showLoading();
    let userData = await fetchUserData(userId);
    hideLoading();
    if (!userData)
    {
        alert("ID tidak ditemukan dalam database.");
        return;
    }
    document.getElementById('nama').value = userData.nama;
    document.getElementById('departemen').value = userData.departemen;

    getLocationAndDecode();
});

// Validasi form sebelum submit
function validateForm()
{
    const id = document.getElementById('id').value.trim();
    const nama = document.getElementById('nama').value.trim();
    const departemen = document.getElementById('departemen').value.trim();
    const lokasi = document.getElementById('lokasi').value.trim();
    const presensi = document.querySelector('input[name="presensi"]:checked');

    if (id && nama && departemen && lokasi && presensi)
    {
        enableSubmit();
    } else
    {
        disableSubmit();
    }
}

// Event untuk Tombol "Re-Check Location"
document.getElementById('reCheckLocationButton').addEventListener('click',function ()
{
    getLocationAndDecode(); // Re-cek lokasi tanpa mengubah Nama & Departemen
});

// Mengambil lokasi & decode alamat
async function getLocationAndDecode()
{
    showLoading();

    if (navigator.geolocation)
    {
        navigator.geolocation.getCurrentPosition(
            async function (position)
            {
                let latitude = position.coords.latitude;
                let longitude = position.coords.longitude;

                document.getElementById('latitude').value = latitude;
                document.getElementById('longitude').value = longitude;

                // Ambil alamat dari Nominatim API
                let alamat = await getAddressFromCoordinates(latitude,longitude);
                hideLoading();
                if (alamat)
                {
                    showRecheck();
                    document.getElementById('lokasi').value = alamat;
                } else
                {
                    alert("Gagal mendapatkan alamat. Coba ulangi.");
                }
            },
            function (error)
            {
                hideLoading();
                console.error("Gagal mendapatkan lokasi:",error.message);
                alert(`Gagal mendapatkan lokasi: ${error.message}`);
            }
        );
    } else
    {
        hideLoading();
        alert('Browser Anda tidak mendukung geolokasi.');
    }
}

// Mengambil alamat dari koordinat
async function getAddressFromCoordinates(latitude,longitude)
{
    try
    {
        let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        let data = await response.json();
        return data.display_name || "Lokasi tidak ditemukan";
    } catch (error)
    {
        console.error("Gagal mendapatkan lokasi:",error);
        return "Error saat mengambil lokasi";
    }
}

// Cegah submit jika lokasi belum berhasil didecode
document.getElementById('absenForm').addEventListener('submit',function (e)
{
    let alamat = document.getElementById('lokasi').value.trim();
    if (!alamat || alamat === "Lokasi tidak ditemukan" || alamat === "Error saat mengambil lokasi")
    {
        alert("Silakan cek lokasi terlebih dahulu sebelum submit.");
        e.preventDefault();
    }
});

// Tangkap event submit dari form
document.getElementById('absenForm').addEventListener('submit',async function (e)
{
    e.preventDefault();
    showLoading();

    const formData = new FormData();
    formData.append("id",document.getElementById('id').value.trim());
    formData.append("nama",document.getElementById('nama').value.trim());
    formData.append("departemen",document.getElementById('departemen').value.trim());
    formData.append("tanggal",document.getElementById('tanggal').value.trim());
    formData.append("lokasi",document.getElementById('lokasi').value.trim());
    formData.append("latitude",document.getElementById('latitude').value.trim());
    formData.append("longitude",document.getElementById('longitude').value.trim());
    formData.append("presensi",document.querySelector('input[name="presensi"]:checked')?.value?.trim());
    formData.append("jam",new Date().toLocaleTimeString('id-ID',{ hour: '2-digit',minute: '2-digit',second: '2-digit' }));
    formData.append("uuid",await getUUID());
    formData.append("fingerprint",await getFingerprint());
    formData.append("ip",await getIPAddress());

    try
    {
        let response = await fetch("https://script.google.com/macros/s/AKfycbxKKz4xh7AfSEJUUPsfd8gFhkNyfdzDArDf_gpKvpvgzJpeT7z8ozdQMZ6vZRNskkaekA/exec",{
            method: "POST",
            body: formData
        });
        console.log(formData)

        let result = await response.json();

        // Cek apakah respons sukses
        if (result.success)
        {
            alert("Absensi berhasil!");
            document.getElementById('absenForm').reset();
        } else
        {
            alert(result.message);
        }
        disableSubmit();
    } catch (error)
    {
        console.error("Error:",error);
        alert("Gagal mengirim data. Coba lagi nanti.");
    }

    // Reset tombol setelah submit
    hideLoading();
    setTanggal();
});


// Fungsi tambahan
function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }
function showRecheck() { document.getElementById('reCheckLocationButton').style.display = 'flex'; }
function hideRecheck() { document.getElementById('reCheckLocationButton').style.display = 'none'; }
function enableSubmit() { document.getElementById('submitButton').disabled = false; }
function disableSubmit() { document.getElementById('submitButton').disabled = true; }

