import axios from 'axios'

export const storeFile = (file) => {
  const config = {
    method: 'put',
    maxBodyLength: Infinity,
    url: 'https://azcistaecpdev01.blob.core.windows.net/ecp/maruti.png?st=2026-04-02T06%3A35%3A31Z&se=2026-04-02T07%3A40%3A31Z&sp=raw&sv=2026-02-06&sr=c&sig=8FdAFDsmY67TOZ/DkX6pO4rGzIHmtlJ5m7rrifucDdQ%3D',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'application/octet-stream'
    },
    data: data
  };
  return axios.request(config);
}