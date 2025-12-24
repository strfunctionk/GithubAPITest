/**
 * Buffer 데이터를 클라이언트에게 ZIP 파일로 전송합니다.
 * @param {Response} res - Express의 res 객체
 * @param {Buffer} buffer - ZIP 데이터 버퍼
 * @param {string} fileName - 다운로드될 파일명
 */
export const sendZipResponse = (res, buffer, fileName) => {
  const finalName = fileName.endsWith(".zip") ? fileName : `${fileName}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename=${finalName}`);

  return res.send(buffer);
};
