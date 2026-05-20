#ifndef TLS_WRAPPER_H
#define TLS_WRAPPER_H

#include <mbedtls/ssl.h>
#include <mbedtls/entropy.h>
#include <mbedtls/ctr_drbg.h>
#include <mbedtls/x509_crt.h>
#include <mbedtls/pk.h>
#include <mbedtls/error.h>

#include <switch.h>
#include <string.h>

class TlsWrapper {
public:
    TlsWrapper() {
        mbedtls_ssl_init(&ssl);
        mbedtls_ssl_config_init(&conf);
        mbedtls_x509_crt_init(&cacert);
        mbedtls_x509_crt_init(&srvcert);
        mbedtls_pk_init(&pkey);
        mbedtls_entropy_init(&entropy);
        mbedtls_ctr_drbg_init(&ctr_drbg);
    }

    ~TlsWrapper() {
        mbedtls_ssl_free(&ssl);
        mbedtls_ssl_config_free(&conf);
        mbedtls_x509_crt_free(&cacert);
        mbedtls_x509_crt_free(&srvcert);
        mbedtls_pk_free(&pkey);
        mbedtls_entropy_free(&entropy);
        mbedtls_ctr_drbg_free(&ctr_drbg);
    }

    int initialize() {
        int ret;
        const char *pers = "aura_nx_sysmodule";

        // Seed RNG
        if ((ret = mbedtls_ctr_drbg_seed(&ctr_drbg, mbedtls_entropy_func, &entropy,
                                       (const unsigned char *)pers, strlen(pers))) != 0) {
            return ret;
        }

        // Load certificates from SD card
        // Certificates should be placed at sdmc:/aura-nx/certs/
        ret = mbedtls_x509_crt_parse_file(&cacert, "sdmc:/aura-nx/certs/ca.crt");
        if (ret != 0) return ret;

        ret = mbedtls_x509_crt_parse_file(&srvcert, "sdmc:/aura-nx/certs/server.crt");
        if (ret != 0) return ret;

        ret = mbedtls_pk_parse_keyfile(&pkey, "sdmc:/aura-nx/certs/server.key", NULL);
        if (ret != 0) return ret;

        // Setup SSL configuration
        if ((ret = mbedtls_ssl_config_defaults(&conf,
                                              MBEDTLS_SSL_IS_SERVER,
                                              MBEDTLS_SSL_TRANSPORT_STREAM,
                                              MBEDTLS_SSL_PRESET_DEFAULT)) != 0) {
            return ret;
        }

        mbedtls_ssl_conf_rng(&conf, mbedtls_ctr_drbg_random, &ctr_drbg);
        mbedtls_ssl_conf_ca_chain(&conf, &cacert, NULL);

        if ((ret = mbedtls_ssl_conf_own_cert(&conf, &srvcert, &pkey)) != 0) {
            return ret;
        }

        // Require client certificate (mTLS)
        mbedtls_ssl_conf_authmode(&conf, MBEDTLS_SSL_VERIFY_REQUIRED);

        if ((ret = mbedtls_ssl_setup(&ssl, &conf)) != 0) {
            return ret;
        }

        return 0;
    }

private:
    mbedtls_ssl_context ssl;
    mbedtls_ssl_config conf;
    mbedtls_x509_crt cacert;
    mbedtls_x509_crt srvcert;
    mbedtls_pk_context pkey;
    mbedtls_entropy_context entropy;
    mbedtls_ctr_drbg_context ctr_drbg;
};

#endif // TLS_WRAPPER_H
