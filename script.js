// Set tanggal dan jam otomatis saat halaman pertama kali diload
window.onload = function ()
{
    setTanggal();
    hideRecheck();
    showCheck();
};

// Fungsi untuk set tanggal otomatis
function setTanggal()
{
    const now = new Date();
    const tanggal = now.toISOString().split('T')[0]; // Tanggal dalam format YYYY-MM-DD
    document.getElementById('tanggal').value = tanggal;
    document.getElementById('jam').placeholder = "Otomatis"; // Placeholder untuk jam
}

// Fungsi untuk set tanggal dan jam saat submit
function setTanggalJam()
{
    const now = new Date();
    const tanggal = now.toISOString().split('T')[0]; // Tanggal dalam format YYYY-MM-DD
    const jam = now.toTimeString().split(' ')[0].substring(0,5); // Jam dalam format HH:MM

    document.getElementById('tanggal').value = tanggal;
    document.getElementById('jam').value = jam;
}

// Ambil IP Address
let userIP = '';
fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data =>
    {
        userIP = data.ip;
        checkUserIP(userIP); // Cek apakah IP sudah ada di tabel 2
    })
    .catch(error => console.error('Gagal mendapatkan IP:',error));

// Fungsi untuk mengecek apakah IP sudah ada di Tabel 2
function checkUserIP(ip)
{
    fetch(`https://script.google.com/macros/s/AKfycbwmfXBeZY515fIZRQCyGfcGycKRlorU5CiSsMw_yxTGYoFGE59s4bTm1ghCRnugmLIVvw/exec?checkIP=${ip}`)
        .then(response => response.json())
        .then(data =>
        {
            if (data.exists)
            {
                document.getElementById('nama').value = data.nama; // Auto-fill nama dari Tabel 2 jika IP sudah terdaftar
                document.getElementById('nama').readOnly = true; // Kunci input nama untuk mencegah perubahan
            }
        })
        .catch(error => console.error('Gagal mengecek IP:',error));
}

function showLoading()
{
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading()
{
    document.getElementById('loading').style.display = 'none';
}

function showRecheck()
{
    document.getElementById('reCheckLocationButton').style.display = 'inline-flex';
}

function hideRecheck()
{
    document.getElementById('reCheckLocationButton').style.display = 'none';
}

function showCheck()
{
    document.getElementById('getLocationButton').style.display = 'flex';
}

function hideCheck()
{
    document.getElementById('getLocationButton').style.display = 'none';
}

document.getElementById('getLocationButton').addEventListener('click',function ()
{
    getLocationAndDecode();
});

document.getElementById('reCheckLocationButton').addEventListener('click',function ()
{
    getLocationAndDecode();
});



// Fungsi untuk mendapatkan lokasi & decode alamat
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

                if (alamat !== "Lokasi tidak ditemukan" && alamat !== "Error saat mengambil lokasi")
                {
                    hideLoading();
                    hideCheck();
                    showRecheck();
                    document.getElementById('lokasi').value = alamat;
                } else
                {
                    hideLoading();
                    alert("Gagal mendapatkan alamat. Coba ulangi.");
                }
            },
            function ()
            {
                hideLoading();
                alert('Gagal mendapatkan lokasi.');
            }
        );
    } else
    {
        hideLoading();
        alert('Browser Anda tidak mendukung geolokasi.');
    }
}

// Fungsi untuk mengambil alamat dari Nominatim API
async function getAddressFromCoordinates(latitude,longitude)
{
    showLoading();

    try
    {
        let url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        let response = await fetch(url);
        let json = await response.json();

        if (json && json.display_name)
        {
            hideLoading();
            return json.display_name;
        } else
        {
            hideLoading();
            return "Lokasi tidak ditemukan";
        }
    } catch (e)
    {
        console.error("Gagal mendapatkan lokasi:",e);
        hideLoading();
        return "Error saat mengambil lokasi";
    }
}

// Cegah submit jika lokasi belum berhasil didecode
document.getElementById('absenForm').addEventListener('submit',function (e)
{
    let alamat = document.getElementById('alamat').value;
    if (alamat === "" || alamat === "Lokasi tidak ditemukan" || alamat === "Error saat mengambil lokasi")
    {
        alert("Silakan cek lokasi terlebih dahulu sebelum submit.");
        e.preventDefault();
    }
});


// Tambahkan loading saat klik "Submit"
document.getElementById('absenForm').addEventListener('submit',function (e)
{
    e.preventDefault();
    showLoading();

    setTanggalJam();
    const formData = new FormData(this);
    formData.append('ip',userIP);

    fetch('https://script.google.com/macros/s/AKfycbwmfXBeZY515fIZRQCyGfcGycKRlorU5CiSsMw_yxTGYoFGE59s4bTm1ghCRnugmLIVvw/exec',{
        method: 'POST',
        body: formData,
    })
        .then(response => response.json())
        .then(data =>
        {
            alert(data.message);
            this.reset();
            setTanggal();
            hideLoading();
        })
        .catch(error =>
        {
            alert('Gagal mengirim data.');
            hideLoading();
            console.error(error);
        });
});


